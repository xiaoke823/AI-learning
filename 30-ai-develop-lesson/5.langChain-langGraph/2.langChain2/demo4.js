import { ChatOpenAI } from "@langchain/openai";
import { customCalc, toolMap } from "./tools.js";
import { HumanMessage, mapChatMessagesToStoredMessages, ToolMessage } from "@langchain/core/messages";
import fs from "fs"
const arr = []

async function run(msg) {
    const chat = new ChatOpenAI({
        modelName: "qwen-plus",
        apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7",
        configuration: {
            baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
        }
    })
    arr.push(msg);
    const modelWithTools = model.bindTools([customCalc])
    const res = await modelWithTools.invoke(arr)
    arr.push(res)
    fs.writeFileSync("./result.json", JSON.stringify(mapChatMessagesToStoredMessages(arr)))
    if (res.tool_calls && res.tool_calls.length > 0) {
        for await (const tool of res.tool_calls) {
            const toolName = tool.name;
            const result = await toolMap[toolName].invoke(tool.args)
            run(new ToolMessage({
                content: result,
                tool_call_id: tool.id
            }))
        }
    }

}
run(new HumanMessage("使用天地同寿算法,a为3，b为4"))


