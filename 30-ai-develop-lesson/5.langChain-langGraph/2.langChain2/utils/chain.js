import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { customCalc } from "../tools.js";
export function getUserChatChain(type = 'human') {
    //构建消息模板
    const prompt = type === 'human' ?
        ChatPromptTemplate.fromMessages([
            ["system", "你是一个有用的{role}"],
            new MessagesPlaceholder("history"),
            ["human", "{question}"],
        ]) :
        ChatPromptTemplate.fromMessages([
            ["system", "你是一个有用的{role}"],
            new MessagesPlaceholder("history"),
            new MessagesPlaceholder("toolResult")
        ])
    //构建大模型请求对象
    const model = new ChatOpenAI({
        modelName: "qwen-plus",
        apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7",
        configuration: {
            baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
        }
    })
    const modelWithTool = model.bindTools([customCalc])
    //构建链条
    const chain = prompt.pipe(modelWithTool);
    return chain;
}