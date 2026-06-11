//引入express-一个非常简单的node服务库
import express from "express";
//cors-专门解决跨域问题的
import cors from "cors";
//openai-专门用来按标准请求大模型接口的一个sdk库，
import OpenAI from "openai";
import { readConversation, writeConversation, summaryTitle, requestAI, linkMcpAndListTool } from "./utils/utils.js"
//创建了一个express服务对象
const app = express();

//设置跨域
app.use(cors())
//设置解析请求体，这样才能拿到req.body
app.use(express.json())
const mcpResult = await linkMcpAndListTool()
console.log(mcpResult)
const openai = new OpenAI({
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7"
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
        queryObj,
        mcpResult
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
    const userAllConversation = conversationObj[userId];

    const targetCOnversation = userAllConversation[convertId];
    res.json({
        success: true,
        data: targetCOnversation,
        message: "查询成功"
    })
})
app.get("/conversation/list", async (req, res) => {
    const userId = req.query.userId;
    const conversationObj = readConversation();
    const userAllConversation = conversationObj[userId];
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


//把服务开启来了开在了3000端口
app.listen(3000)