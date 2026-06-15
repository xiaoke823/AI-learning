import { HumanMessage, SystemMessage } from "@langchain/core/messages"
import { ChatOpenAI } from "@langchain/openai"
import { ChatAnthropic } from "@langchain/anthropic"
import fs from "fs"

// 拦截 fetch 请求
const originalFetch = globalThis.fetch
globalThis.fetch = async (url, options = {}) => {
    // 写入请求头
    const headers = options.headers ? Object.fromEntries(
        options.headers instanceof Headers ? options.headers.entries() : Object.entries(options.headers)
    ) : {}
    fs.writeFileSync("header.json", JSON.stringify(headers, null, 2), "utf-8")

    // 写入请求体
    if (options.body) {
        fs.writeFileSync("req.json", options.body, "utf-8")
    }

    // 发送原始请求
    const response = await originalFetch(url, options)

    // 克隆响应以便读取
    const clonedResponse = response.clone()

    // 写入响应体
    const responseBody = await clonedResponse.text()
    fs.writeFileSync("res.json", responseBody, "utf-8")

    // 返回原始响应
    return new Response(responseBody, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
    })
}

const messageList1 = [
    new SystemMessage("你是一个聊天机器人"),
    new HumanMessage("你好"),
    new HumanMessage({
        content: [
            { type: "text", text: "你是人吗，我是人吗，我到底是不是人啊" },
            { type: "image_url", image_url: "data:image/png;base64,/9j/4AAQS" }
        ]
    })
]
const chat = new ChatOpenAI({
    modelName: "qwen-plus",
    apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7",
    configuration: {
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    }
})
// const chat = new ChatAnthropic({
//     model: "doubao-seed-2.0-code",
//     anthropicApiKey: "edf67641-ba86-4d69-a848-06818c5b883a",
//     anthropicApiUrl: "https://ark.cn-beijing.volces.com/api/coding"
// })
//调用invoke把请求发出去
const res = await chat.invoke(messageList1)
console.log(res.content);
