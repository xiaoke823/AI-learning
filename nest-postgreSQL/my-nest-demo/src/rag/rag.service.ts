import { Injectable } from '@nestjs/common';
import { ChatOllama, OllamaEmbeddings } from '@langchain/ollama';
import { config } from 'src/config';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

@Injectable()
export class RagService {
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

    private vectorStore: MemoryVectorStore | null = null;
    // 文档数量
    private docNum = 0;

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

        //向量化
        // fromDocuments 批量将文本块转换为向量，并存储在内存中
        this.vectorStore = await MemoryVectorStore.fromDocuments(docs, this.embeddings)
        this.docNum = docs.length
        return {
            success: true,
            message: `Loaded ${this.docNum} documents`,
            total: this.docNum,
            originalChunks: documents.length,
        }
    }

    getStatus() {
        return {
            success: true,
            message: `RAG status`,
            loaded: !!this.vectorStore,
            docs: this.docNum
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
                score: parseFloat(score.toFixed(2)),
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
                score: parseFloat(score.toFixed(4)),
            })),
        }
    }

    //清空知识库
    clearKnowledge() {
        this.vectorStore = null
        this.docNum = 0
        return { success: true, message: '知识库已清空' }
    }
}
