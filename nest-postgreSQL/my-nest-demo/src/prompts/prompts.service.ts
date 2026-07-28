import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { config } from 'src/config';
import type { Response } from 'express';
import { StringOutputParser } from '@langchain/core/output_parsers'
import { ChatPromptTemplate, FewShotPromptTemplate, PromptTemplate } from '@langchain/core/prompts'
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

@Injectable()
export class PromptsService {
    // 首先创建模型实例，这里使用的是 ollama 的 API
    private llm = new ChatOllama({
        model: config.ollama.chatModel,
        temperature: config.ollama.temperature,
        baseUrl: config.ollama.host, // 服务地址
        think: false, // 是否开启 think 模式，即是否在模型中运行代码
        numPredict: 512, // 预测的长度，即模型返回的答案
    })

    // 多消息对话模板，
    async translate(text: string, language: string) {
        const prompt = ChatPromptTemplate.fromMessages([
            ['system', '你是一个翻译助手，只输出翻译结果，帮助用户将文本翻译成指定的语言'],
            ['human', '将以下语言翻译成{language}: {text}'],

        ])

        const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())
        const response = await chain.invoke({ language, text })
        return {
            origintext: text,
            targettext: response,
            language: language
        }
    }

    async summary(text: string, maxWords: number) {
        const prompt = ChatPromptTemplate.fromTemplate('请把以下内容总结成{maxWords}个字：{text}')

        const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())
        const response = await chain.invoke({ maxWords, text })
        return {
            origintext: text,
            summary: response
        }
    }

    async classify(text: string) {
        // 数组的例子,包含积极，消极，中立
        const examples = [
            { input: '我很喜欢这个产品', output: '积极' },
            { input: '这个产品不好用', output: '消极' },
            { input: '这个产品还行吧', output: '中立' },
            { input: '这个产品非常棒', output: '积极' },
        ]
        const examplePrompt = PromptTemplate.fromTemplate(
            `输入：{input}\n输出：{output}`
        )
        const fewShotPrompt = new FewShotPromptTemplate({
            examples,
            examplePrompt,
            prefix: '根据输入的文本内容进行情感分类：输出为积极、消极或中立。',
            suffix: '输入：{text}\n输出：',
            inputVariables: ['text'],
        })

        const chain = fewShotPrompt.pipe(this.llm).pipe(new StringOutputParser())
        const response = await chain.invoke({ text })
        return {
            origintext: text,
            label: response
        }
    }

    async codeReview(code: string, language: string) {
        const prompt = ChatPromptTemplate.fromMessages([
            [
                'system',
                `你是资深{language}开发工程师，负责代码审查。
审查维度：代码规范 / 潜在 Bug / 性能问题 / 改进建议
输出格式：总体评分（1-10分）+ 具体问题列表 + 改进代码片段`,
            ],
            ['human', '请审查以下{language}代码：\n\n\`\`\`{language}\n{code}\n\`\`\`'],
        ])

        const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())
        const result = await chain.invoke({ code, language })

        return { language, code, review: result }
    }
}
