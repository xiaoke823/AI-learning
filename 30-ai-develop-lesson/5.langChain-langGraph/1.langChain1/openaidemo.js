const openai = new OpenAI({
    baseURL: "https://dashscope.aliyuncs.com/api/v1",
    apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7"
})

//如果请求openai
const messageList = [
    {
        role: "system",
        content: systemString
    },
    {
        role: "user",
        content: [
            { type: "text", text: "按时大大撒所" },
            { type: "image_url", image_url: "sxxx" }
        ]
    }
]
const llmres = await openai.chat.completions.create({
    model: "qwen3.5-plus",
    messages: messageList

})
//消费返回
console.log(chunk.choices[0].message.content)






//突然有一天要改成请求gemini协议的
//那么我们就得改代码，首先修改我们构建好的适合openai的message，改成适合gemini
const messageListGemini = [
    {
        role: "user",
        parts: [
            { text: "你好" }
        ]
    }
    //system也不能待在这里了
]

//改用request，body结构也得大概
const response = await openai.request({
    method: "post",
    path: "gemini协议的地址",
    body: {
        model: "xxx",
        content: messageListGemini,
        system_instruction: {
            parts: [{ text: "系统上下文" }]
        }
    },
})
//消费出参的方案也得改
console.log(response.candidates[0].content)