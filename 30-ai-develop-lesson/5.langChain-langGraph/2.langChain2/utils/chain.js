import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { StringOutputParser } from "@langchain/core/output_parsers";
export function getUserChatChain() {
    //构建消息模板
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", "你是一个有用的{role}"],
        new MessagesPlaceholder("history"),
        ["human", "{question}"],
    ]);
    //构建大模型请求对象
    const model = new ChatOpenAI({
        modelName: "qwen-plus",
        apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7",
        configuration: {
            baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
        }
    })
    //构建链条
    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    return chain;
}