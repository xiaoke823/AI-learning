// 回话管理

//引入express-一个非常简单的node服务库
import express from 'express'
//cors-专门解决跨域问题的
import cors from 'cors'
//openai-专门用来按标准请求大模型接口的一个sdk库，
import OpenAI from 'openai'
import fs from 'fs'
import {summaryMessage,readConversation,writeConversation} from './utils.js'
//创建了一个express服务对象
const app = express();

//设置跨域
app.use(cors())
//同步读取
const sytemContext = fs.readFileSync("./context.md")
//转文本，否则是buffer
const systemString = sytemContext.toString();
const messageList = [
    {
        role: "system",
        content: systemString
    }
]
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
        role: "user",
        content: keyword
    };
    if (messageList.length > 10) {
        //算出来要截取多少条
        // 多截取一些
        const removeNum = messageList.length - 6
        const removeList = messageList.splice(1, removeNum)
        const summaryRes = await summaryMessage(openai, removeList)
        messageList.splice(1, 0, summaryRes)
    }
    //每次提问，存到messageList，保存上下文
    messageList.push(queryObj);
    const llmres = await openai.chat.completions.create({
        model: "gui-plus-2026-02-26",
        messages: messageList
    })
    //每次回答，存到messageList，保存上下文
    messageList.push(llmres.choices[0].message);
    // res.json(llmres.choices[0].message);
    res.json({
        success:true,
        message:llmres.choices[0].message
    })
});

app.get('/conversation/create',async(req,res)=>{
    const userId = req.query.userId
    const conversationObj = readConversation()
    if(!conversationObj[userId]) {
        conversationObj[userId] = {}
    }
    const userObj = conversationObj[userId]
    const convertId = userId + Date.now()
    userObj[convertId] = {
        title:'',
        list:[]
    }
    writeConversation(conversationObj)
    res.json({
        success:true,
        message:'创建成功'
    })

})

app.get("/get", async (req, res) => {
    const userId = req.query.userId
    const convertId = req.query.convertId
    const conversationObj = readConversation()
    const userAllConversation = conversationObj[userId]
    const targetConversation = userAllConversation[convertId]
    console.log('targetConversation',targetConversation)
    res.json({
        success:true,
        message:'查找成功',
        data:targetConversation
    })
});
//把服务开启来了开在了3000端口
app.listen(3000)