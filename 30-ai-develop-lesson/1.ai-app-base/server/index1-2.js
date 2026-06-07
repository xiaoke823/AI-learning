//搭建服务部分
//引入express-一个非常简单的node服务库
import express from 'express'
//cors-专门解决跨域问题的
import cors from 'cors'
//openai-专门用来按标准请求大模型接口的一个sdk库，
import OpenAI from 'openai'
//创建了一个express服务对象
const app = express();
//设置跨域
app.use(cors());

//重写了fetch，让整个项目通过fetch发请求的时候会打印出一些东西
const originalFetch = global.fetch;
global.fetch = async function (...args) {
    const [url, options = {}] = args;
    // 打印请求信息
    console.log('=== FETCH REQUEST START ===');
    console.log('URL:', url);
    console.log('Method:', options.method || 'GET');

    // 打印请求头
    if (options.headers) {
        console.log('Request Headers:', options.headers);
    }

    // 打印请求体（如果有）
    if (options.body) {
        console.log('Request Body:', options.body);
    }

    console.log('=== FETCH REQUEST END ===');

    try {
        // 调用原始fetch
        const response = await originalFetch.apply(this, args)

        // 克隆响应以便读取body而不影响原始响应
        const clonedResponse = response.clone();
        // 打印响应信息
        console.log('=== FETCH RESPONSE ===');
        console.log('Status:', response.status, response.statusText);
        // 打印响应头
        console.log('Response Headers:');
        for (const [key, value] of clonedResponse.headers.entries()) {
            console.log(`  ${key}: ${value}`);
        }
        // 尝试读取响应体
        const json = await clonedResponse.json();
        console.log('Response Body (JSON):', JSON.stringify(json, null, 2));
        console.log('=== FETCH REQUEST END ===\n');

        // 返回原始响应
        return response;

    } catch (error) {
        console.log('=== FETCH ERROR ===');
        console.log('Error:', error.message);
        console.log('=== FETCH REQUEST END ===\n');
        throw error;
    }
};

//保存记忆
const messageList=[
    {
        role:'system',
        content: "你是一个优秀的前端开发工程师，你的公司用的vue3+elementplus"
    }
]
//只需要在服务启动的时候new一次openai
const openai = new OpenAI(
    {
        apiKey: 'sk-d5b24677b0e24f0da678029127102586',
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    }
);

//到时候请求-localhost:3000/llm?keyword="用户输入的问题" 
app.get("/llm", async (req, res) => {
    const keyword = req.query.keyword;
    const queryObj = {
        role:'user',
        content:keyword
    }
    //每次提问存到messageList中,保存上下文
    messageList.push(queryObj)
    const llmres = await openai.chat.completions.create({
        model:"gui-plus-2026-02-26",
        messages:messageList
    })
    //每次回答也存到messageList中,保存上下文
    messageList.push(llmres.choices[0].message)
    res.json(llmres.choices[0].message)
    // console.log(llmres.choices.message.content)
})

//把服务开启来了开在了3000端口
app.listen(3000)