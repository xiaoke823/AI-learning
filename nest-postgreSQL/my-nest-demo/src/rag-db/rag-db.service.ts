import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { config } from 'src/config';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
// import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { PGVectorStore, DistanceStrategy } from '@langchain/community/vectorstores/pgvector';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { Pool } from 'pg';

@Injectable()
export class RagDbService implements OnModuleInit, OnModuleDestroy {
    // 首先创建模型实例，这里使用的是 ollama 的 API
    private llm = new ChatOllama({
        model: config.ollama.chatModel,
        temperature: config.ollama.temperature,
        baseUrl: config.ollama.host, // 服务地址
        think: false, // 是否开启 think 模式，即是否在模型中运行代码
        numPredict: 512, // 预测的长度，即模型返回的答案
    })

    // 向量化模型实例
    private embeddings = new OllamaEmbeddings({
        model: config.ollama.embedModel,
        baseUrl: config.ollama.host,
    })

    // ✅ 关键：Pool 在 Service 层创建，整个 Service 生命周期内共用一个
    // 不要在每个方法里创建 Pool，更不要在方法里 end() 它
    private pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        // 连接池配置（可选，生产环境建议显式配置）
        max: 10,              // 最大连接数，根据并发量调整
        idleTimeoutMillis: 30000,  // 空闲连接 30 秒后释放
        connectionTimeoutMillis: 5000, // 获取连接超时 5 秒
    })

    // ✅ 关键：pgVectorConfig 里传 pool 而不是 postgresConnectionOptions
    // 传 pool → PGVectorStore 直接用这个池，不会自己创建新池，end() 就无效了
    // 传 postgresConnectionOptions → PGVectorStore 自己创建新池，end() 会销毁它
    private pgVectorConfig = {
        pool: this.pool,                          // ← 传已有 pool，不是连接字符串
        collectionName: 'rag-knowledge-base',
        collectionTableName: 'langchain_pg_collection',
        tableName: 'langchain_pg_embedding',
        columns: {
            idColumnName: 'id',
            vectorColumnName: 'embedding',
            contentColumnName: 'document',
            metadataColumnName: 'cmetadata',
        },
        distanceStrategy: 'cosine' as DistanceStrategy,
        // ⚠️ 启动时跳过表结构检查（ensureCollectionTableInDatabase）
        // 原因：源码用英文 "already exists" 判断"列已存在可忽略"，但中文 locale
        // 返回"已经存在"，匹配失败导致误抛错。表已建好后跳过检查即可正常使用。
        // 代价：以后换 embedding 模型（维度变了）需要手动处理表结构。
        skipInitializationCheck: true,
    }
    private vectorStore: PGVectorStore | null = null;
    // 文档数量
    private docNum = 0;

    // ✅ 应用启动时初始化：连接数据库、确保表已建好（这一步不写入任何数据）
    // 这是 pg 版和内存版最大的区别：数据持久化在库里，重启服务后旧数据还在，照样能查
    async onModuleInit() {
        this.vectorStore = await PGVectorStore.initialize(this.embeddings, this.pgVectorConfig)
    }

    // ✅ 应用关闭时关闭连接池，避免连接泄漏
    async onModuleDestroy() {
        await this.pool.end()
    }

    async loadDocuments(documents: { id: string, content: string; source?: string }[]) {
        //文本拆分
        const textSplitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
            separators: ['\n\n', '\n', '。', '！', '？', '\r\n'],
        })
        const docs: Document[] = []
        for (const doc of documents) {
            const chunks = await textSplitter.createDocuments(
                [doc.content],
                [{ id: doc.id, source: doc.source }]
            )
            docs.push(...chunks)
        }

        // 向量化并写入 PostgreSQL + pgvector
        // onModuleInit 已经 initialize 过 store，这里直接「追加」写入
        // ⚠️ 注意：pg 版是追加不是覆盖，重复调 loadDocuments 数据会累积
        if (!this.vectorStore) {
            return { success: false, message: '向量库未初始化' }
        }
        await this.vectorStore.addDocuments(docs)
        this.docNum += docs.length
        return {
            success: true,
            message: `Loaded ${this.docNum} documents`,
            total: this.docNum,
            originalChunks: documents.length,
        }
    }

    // ✅ 直接查库拿真实条数，不依赖内存里的 docNum（重启后内存计数会丢，但库里数据还在）
    async getStatus() {
        try {
            const result = await this.pool.query(
                `SELECT COUNT(*) FROM langchain_pg_embedding
                 WHERE collection_id = (
                   SELECT uuid FROM langchain_pg_collection WHERE name = $1
                 )`,
                [this.pgVectorConfig.collectionName],
            )
            const chunkCount = parseInt(result.rows[0].count)
            return {
                success: true,
                mode: 'PGVectorStore',
                loaded: chunkCount > 0,
                docs: chunkCount,
                collection: this.pgVectorConfig.collectionName,
                message: chunkCount > 0
                    ? `向量库中有 ${chunkCount} 个文档块`
                    : '向量库为空，请先加载文档',
            }
        } catch {
            return { success: false, mode: 'PGVectorStore', loaded: false, message: '向量表未初始化' }
        }
    }


    async search(query: string) {
        if (!this.vectorStore) {
            return {
                success: false,
                message: `No documents loaded`,
            }
        }
        const results = await this.vectorStore.similaritySearchWithScore(query, 1)
        return {
            success: true,
            message: `Search results`,
            results: results.map(([doc, score]) => ({
                content: doc.pageContent,
                // score 是余弦距离（越小越相关），转成相似度更直观
                similarity: parseFloat((1 - score).toFixed(4)),
                rawDistance: parseFloat(score.toFixed(4)),
                source: doc.metadata.source,
                id: doc.metadata.id,
            })),
            query,
        }
    }

    async searchEmbeding(question: string) {
        if (!this.vectorStore) {
            return {
                success: false,
                message: `No documents loaded`,
            }
        }
        // step1: 检索
        const retrieved = await this.vectorStore.similaritySearchWithScore(question, 1)
        if (!retrieved.length) {
            return { question, answer: '知识库中没有找到相关内容', sources: [] }
        }

        // Step 2：把检索结果拼成 context 字符串
        // [1] 第一块内容\n\n[2] 第二块内容...
        // 编号方便模型在回答时引用："根据[1]..."
        const context = retrieved
            .map(([doc], i) => `[${i + 1}] ${doc.pageContent}`)
            .join('\n\n')

        // Step 3：RAG Prompt，严格限制模型只能用参考资料回答
        const prompt = ChatPromptTemplate.fromMessages([
            [
                'system',
                `你是知识库问答助手，严格基于参考资料回答。
                规则：
                1. 只根据参考资料内容回答，不能使用资料外的知识
                2. 资料中没有相关信息，回答"知识库中暂无相关内容"
                3. 回答简洁准确，使用中文
                
                参考资料：
                {context}`,
            ],
            ['human', '{question}'],
        ])

        // Step 4：调用模型生成回答
        const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())
        const answer = await chain.invoke({ context, question })

        return {
            question,
            answer,
            sources: retrieved.map(([doc, score]) => ({
                content: doc.pageContent,
                source: doc.metadata.source,
                similarity: parseFloat((1 - score).toFixed(4)),
            })),
        }
    }

    // 清空知识库：直接用 SQL 删掉当前 collection 的所有文档块 + collection 记录
    // 比 store.delete({filter:{}}) 更直接可控，明确按 collection 名删
    async clearKnowledge() {
        await this.pool.query(
            `DELETE FROM langchain_pg_embedding
             WHERE collection_id = (
               SELECT uuid FROM langchain_pg_collection WHERE name = $1
             )`,
            [this.pgVectorConfig.collectionName],
        )
        await this.pool.query(
            `DELETE FROM langchain_pg_collection WHERE name = $1`,
            [this.pgVectorConfig.collectionName],
        )
        this.docNum = 0
        return { success: true, message: `已清空 collection：${this.pgVectorConfig.collectionName}` }
    }
}
