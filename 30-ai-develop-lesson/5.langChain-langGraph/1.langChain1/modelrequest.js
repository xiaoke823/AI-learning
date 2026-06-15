
import { ChatOpenAI } from "@langchain/openai"
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { StringOutputParser } from "@langchain/core/output_parsers"



const prompt = ChatPromptTemplate.fromMessages([
    ["system", "你是一个聊天机器人"],
    ["system", "以下是用户的资料{sys}"],
    ["human", "你好，{a}"]
]);

const model = new ChatOpenAI({
    modelName: "qwen-plus",
    apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7",
    configuration: {
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    }
})

const chain = prompt.pipe(model).pipe(new StringOutputParser())

// const res = await chat.invoke({ a: "ai" });
const res = await chain.invoke({
    sys: "用户是个男的",
    a: "ai"
});
console.log(res)