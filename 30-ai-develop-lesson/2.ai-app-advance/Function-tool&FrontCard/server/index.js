//引入express-一个非常简单的node服务库
require('dotenv').config()
const express = require("express")
//cors-专门解决跨域问题的
const cors = require("cors")
//openai-专门用来按标准请求大模型接口的一个sdk库，
const OpenAI = require("openai/index.js")
//创建了一个express服务对象
const app = express();
const fs = require("fs");
const { toolList, toolHandleMap } = require("./tools.js")
const { readConversation, writeConversation, summaryTitle, requestAI } = require("./utils.js");

//设置跨域
app.use(cors())
//设置解析请求体，这样才能拿到req.body
app.use(express.json())


const openai = new OpenAI({
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey: process.env.API_KEY
})
//到时候请求-localhost:3000/llm?keyword="用户输入的问题" 
app.post("/llm", async (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });
    const { keyword, userId, convertId } = req.body;

    const queryObj = {
        role: "user",
        content: keyword
    };
    await requestAI({
        openai,
        userId,
        convertId,
        res,
        queryObj
    })
});
app.get("/conversation/create", async (req, res) => {
    const userId = req.query.userId;
    const conversationObj = readConversation();
    if (!conversationObj[userId]) {
        conversationObj[userId] = {}
    }
    const userConversatioObj = conversationObj[userId];
    const convertId = userId + Date.now();
    userConversatioObj[convertId] = {
        title: "",
        list: []
    }
    writeConversation(conversationObj);
    res.json({
        success: true,
        data: convertId,
        message: "创建成功"
    })
})
app.get("/conversation/get", async (req, res) => {
    const userId = req.query.userId;
    const convertId = req.query.convertId;
    const conversationObj = readConversation();
    const userAllConversation = conversationObj[userId] || {};
    const targetCOnversation = userAllConversation[convertId] || null;
    res.json({
        success: true,
        data: targetCOnversation,
        message: "查询成功"
    })
})
app.get("/conversation/list", async (req, res) => {
    const userId = req.query.userId;
    const conversationObj = readConversation();
    const userAllConversation = conversationObj[userId] || {};
    //获取到所有的对话id
    const convertIdList = Object.keys(userAllConversation);
    const returnList = []
    //[{id:'',title},{id:"",title}]
    for (let i = 0; i < convertIdList.length; i++) {
        const _id = convertIdList[i];
        const idsConvert = userAllConversation[_id];
        if (idsConvert.title) {
            returnList.push({
                title: idsConvert.title,
                convertId: _id
            })
        } else {
            //检测一下是否已经有对话了，有对话了，在让ai总结，没有就先设个空标题
            if (idsConvert.list.length === 0) {
                returnList.push({
                    title: "",
                    convertId: _id
                })
            } else {
                const aititle = await summaryTitle(openai, idsConvert.list);
                idsConvert.title = aititle
                writeConversation(conversationObj);
                returnList.push({
                    convertId: _id,
                    title: aititle
                })
            }

        }
    }
    res.json({
        success: true,
        data: returnList,
        message: "查询成功"
    })
})

function dp() {
    //真正的去做订票这个事情，是通过我们提前写好的代码实现的
    console.log("订购成功")
}
app.get("/simple", async (req, res) => {
    const { keyword } = req.query
    const system2 = fs.readFileSync("./context2.md");
    const systemString2 = system2.toString();
    const llmres = await openai.chat.completions.create({
        model: "gui-plus-2026-02-26",
        messages: [
            {
                role: "system",
                content: systemString2
            },
            {
                role: "user",
                content: keyword
            }
        ],
        tools: toolList,
        stream: true
    })

    let resObj = {
        role: "assistant",
        id: "",
        content: ""
    }

    for await (let chunk of llmres) {
        const delta = chunk.choices[0].delta
        resObj.id = chunk.id
        resObj.content += delta.content || ''
        if (delta.tool_calls && delta.tool_calls.length > 0) {
            //拼接tool_calls部分
            if (resObj.tool_calls) {
                //已经是第一个以后的chunk，走拼接
                delta.tool_calls.forEach((chunkTool) => {
                    const toolIndex = chunkTool.index;
                    //根据index找到resObj，要拼接进去的对象
                    const targetTool = resObj.tool_calls[toolIndex]
                    if (chunkTool.function?.name) {
                        targetTool.function.name += chunkTool.function?.name
                    }
                    if (chunkTool.function?.arguments) {
                        targetTool.function.arguments += chunkTool.function?.arguments
                    }
                })

            } else {
                //你还是第一个chunk,直接走赋值
                resObj.tool_calls = delta.tool_calls;
            }
        }
    }
    console.log(JSON.stringify(resObj))

    res.end();
})
//把服务开启来了开在了3000端口
app.listen(3000)