import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { config } from 'src/config';
import type { Response } from 'express';
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate } from '@langchain/core/prompts'
import { HumanMessage, SystemMessage } from '@langchain/core/messages';


@Injectable()
export class ModelsService {
    // 首先创建模型实例，这里使用的是 ollama 的 API
    private llm = new ChatOllama({
        model: config.ollama.chatModel,
        temperature: config.ollama.temperature,
        baseUrl: config.ollama.host, // 服务地址
        think: false, // 是否开启 think 模式，即是否在模型中运行代码
        numPredict: 512, // 预测的长度，即模型返回的答案
    })
    async baseChat(message: string) {
        const response = await this.llm.invoke([
            new HumanMessage(message)
        ])
        return {
            question: message,
            answer: response.content,
            usage: response.usage_metadata
        }
    }
    async chatSystem(message: string) {
        const response = await this.llm.invoke([
            new SystemMessage('你是一个非常专业的前端开发工程师以及agent开发工程师'),
            new HumanMessage(message)
        ])
        return {
            question: message,
            answer: response.content,
            usage: response.usage_metadata
        }
    }

    async chatStream(message: string, res: Response) {
        // 设置响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        // 设置跨域相关头，如果需要跨域访问的话
        res.setHeader('Access-Control-Allow-Origin', '*');


        const stream = await this.llm.stream([
            new SystemMessage('你是一个非常专业的前端开发工程师以及agent开发工程师'),
            new HumanMessage(message)
        ])
        let answer = '';
        // sse 事件流处理
        for await (const chunk of stream) {
            answer += chunk.content;
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        // 结束响应
        res.write(`data: [DONE]\n\n`)
        res.end();


        // return {
        //     question: message,
        //     answer
        // }
    }

    async chatWithParser(message: string) {
        // parser 解析器，用于从模型的输出中提取有用的数据
        const chain = this.llm.pipe(new StringOutputParser())
        const answer = await chain.invoke([
            new SystemMessage('你是一个非常专业的前端开发'),
            new HumanMessage(message)
        ])
        return {
            question: message,
            answer
        }
    }

    async translate(text: string, lang: string) {
        const prompt = ChatPromptTemplate.fromMessages([
            ['system', '你是专业翻译，只输出翻译结果'],
            ['human', '把"{text}"翻译成{lang}'],
        ])

        // pipe 把三个步骤串联
        // prompt.invoke() → 格式化消息数组
        // llm.invoke()    → 生成 AIMessage
        // parser.invoke() → 提取 .content，返回字符串
        const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())

        // invoke 返回的直接是字符串，不是 AIMessage 对象
        const result: string = await chain.invoke({ text, lang })

        return result  // '法语翻译结果...'
    }

    async generateBlogPost(keywords: string) {
        const parser = new StringOutputParser()

        // 第一步：生成大纲
        // 这一步必须用 pipe(parser)，把 AIMessage 转成字符串
        // 因为第二步的 {outline} 占位符需要字符串，不能是 AIMessage 对象
        const step1 = ChatPromptTemplate.fromMessages([
            ['human', '根据关键词"{keywords}"生成一个博客大纲'],
        ]).pipe(this.llm).pipe(parser)  // ← 必须加 parser，不然下一步报类型错误

        const outline: string = await step1.invoke({ keywords })

        // 第二步：用大纲生成文章
        // outline 此时是纯字符串，可以直接作为模板变量传入
        const step2 = ChatPromptTemplate.fromMessages([
            ['human', '根据以下大纲写一篇完整文章：\n{outline}'],
        ]).pipe(this.llm).pipe(parser)

        const article: string = await step2.invoke({ outline })

        return { outline, article }
    }

    async chatWithFullChain(message:string, role:string){
        const prompt = ChatPromptTemplate.fromMessages([
            ['system', '你是一个{role}, 请用专业的角度回答问题'],
            ['human', '{message}'],
        ])
        const parser = new StringOutputParser()
        const chain = prompt.pipe(this.llm).pipe(parser)
        const answer = await chain.invoke({ message, role })
        return {
            role,
            message,
            answer
        }
    }
}
