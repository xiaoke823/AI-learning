import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { config } from 'src/config';
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate, FewShotPromptTemplate, PromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence, RunnablePassthrough } from '@langchain/core/runnables';

@Injectable()
export class ChainsService {
    // 首先创建模型实例，这里使用的是 ollama 的 API
    private llm = new ChatOllama({
        model: config.ollama.chatModel,
        temperature: config.ollama.temperature,
        baseUrl: config.ollama.host, // 服务地址
        think: false, // 是否开启 think 模式，即是否在模型中运行代码
        numPredict: 512, // 预测的长度，即模型返回的答案
    })

    private parser = new StringOutputParser()

    async publish(article: string) {
        const analyzePrompt = ChatPromptTemplate.fromMessages([
            ['system', '你是专业编辑，只输出问题列表，不要其他内容。'],
            ['human', '分析这篇文章存在的问题：\n\n{article}'],
        ])

        const polishPrompt = ChatPromptTemplate.fromMessages([
            ['system', '你是专业编辑，根据问题列表润色原文，保持原意。'],
            ['human', '原文：\n{article}\n\n问题：\n{issues}\n\n请输出润色后的文章：'],
        ])
        const parser = new StringOutputParser()
        // 第一步
        const analysischain = analyzePrompt.pipe(this.llm).pipe(parser)
        // 第二步
        // const publishchain = polishPrompt.pipe(this.llm).pipe(parser)

        const fullChain = RunnableSequence.from([
            {
                article: new RunnablePassthrough(),
                issues: analysischain
            },
            polishPrompt.pipe(this.llm).pipe(parser)
        ])

        const result = await fullChain.invoke({ article })
        return { original: article, polished: result }
    }

    // ── 顺序链：博客生成（关键词→大纲→文章→SEO标题）──────
    async generateBlog(keywords: string, style: string) {
        // 三条独立链，顺序执行，上一步输出传给下一步
        const outlineChain = ChatPromptTemplate.fromMessages([
            ['system', '你是专业博客作者，只输出大纲，不要正文。'],
            ['human', '根据关键词"{keywords}"，写一篇{style}风格的博客大纲（3-5个章节）'],
        ]).pipe(this.llm).pipe(this.parser)

        const articleChain = ChatPromptTemplate.fromMessages([
            ['system', '你是专业博客作者，按照大纲写完整文章。'],
            ['human', '大纲：\n{outline}\n\n请写出完整的博客文章：'],
        ]).pipe(this.llm).pipe(this.parser)

        const titleChain = ChatPromptTemplate.fromMessages([
            ['system', '你是SEO专家，只输出5个候选标题。'],
            ['human', '根据以下文章生成5个吸引点击的标题：\n\n{article}'],
        ]).pipe(this.llm).pipe(this.parser)

        const outline = await outlineChain.invoke({ keywords, style })
        const article = await articleChain.invoke({ outline })
        const seoTitles = await titleChain.invoke({ article })

        return { keywords, style, outline, article, seoTitles }
    }


    // ── 条件分支链：客服路由（分类 → 路由到不同处理链）────
    async smartRouter(question: string) {
        // 第一步：分类
        const classifyChain = ChatPromptTemplate.fromMessages([
            [
                'system',
                `分析用户问题，只输出分类标签：
                技术问题 → TECH
                退款问题 → REFUND
                投诉建议 → COMPLAINT
                其他 → OTHER`,
            ],
            ['human', '{question}'],
        ]).pipe(this.llm).pipe(this.parser)

        const category = (await classifyChain.invoke({ question })).trim()

        // 第二步：根据分类选择对应 System Prompt
        const systemMap: Record<string, string> = {
            TECH: '你是技术支持专家，给出具体操作步骤。',
            REFUND: '你是退款专员，引导完成退款流程，态度友好。',
            COMPLAINT: '你是客户关系专员，认真对待投诉，给出解决方案。',
            OTHER: '你是通用客服，友好回答各类问题。',
        }

        const systemPrompt = systemMap[category] || systemMap.OTHER

        const answerChain = ChatPromptTemplate.fromMessages([
            ['system', systemPrompt],
            ['human', '{question}'],
        ]).pipe(this.llm).pipe(this.parser)

        const answer = await answerChain.invoke({ question })
        return { question, category, answer }
    }

}
