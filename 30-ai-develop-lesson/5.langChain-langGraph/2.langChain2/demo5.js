import { ChatOpenAI } from "@langchain/openai";
import { customCalc, toolMap } from "./tools.js";
import { HumanMessage, mapChatMessagesToStoredMessages, ToolMessage } from "@langchain/core/messages";
import fs from "fs"
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MessagesPlaceholder } from "@langchain/core/prompts";


const arr = []
// const prompt = ChatPromptTemplate.fromMessages([
//     ["system", "你是一个有用的{role}"],
//     new MessagesPlaceholder("history"),
//     ["human", "{question}"],
// ]);
const promptWithTool = ChatPromptTemplate.fromMessages([
    ["system", "你是一个有用的{role}"],
    new MessagesPlaceholder("history"),
]);
const model = new ChatOpenAI({
    modelName: "qwen-plus",
    apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7",
    configuration: {
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    }
})

const modelWithTools = model.bindTools([customCalc])


async function run(mes, type = 'human') {
    const query = type === 'human' ? new HumanMessage(mes) : new ToolMessage(mes)
    const chain =  promptWithTool.pipe(modelWithTools)
    arr.push(query);
    const invokeParams = {
        role: "助手",
        history: arr,
    }

    const res = await chain.invoke(invokeParams)
    arr.push(res)
    fs.writeFileSync("./result.json", JSON.stringify(mapChatMessagesToStoredMessages(arr)))
    if (res.tool_calls && res.tool_calls.length > 0) {
        for await (const tool of res.tool_calls) {
            const toolName = tool.name;
            const result = await toolMap[toolName].invoke(tool.args)

            run({
                content: result,
                tool_call_id: tool.id
            }, "tool")
        }
    }

}
run("使用天地同寿算法,a为3，b为4")


