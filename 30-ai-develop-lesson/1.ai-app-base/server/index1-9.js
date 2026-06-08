// 回话管理

//引入express-一个非常简单的node服务库
import express from 'express'
//cors-专门解决跨域问题的
import cors from 'cors'
//openai-专门用来按标准请求大模型接口的一个sdk库，
import OpenAI from 'openai'
import fs from 'fs'
import {summaryMessage,readConversation,writeConversation,summaryTitle} from './utils.js'
//创建了一个express服务对象
const app = express();
//设置解析请求体，这样才能拿到req.body
app.use(express.json())

//设置跨域
app.use(cors())
//同步读取
const sytemContext = fs.readFileSync("./context.md")
//转文本，否则是buffer
const systemString = sytemContext.toString();
// const messageList = [
//     {
//         role: "system",
//         content: systemString
//     }
// ]
const openai = new OpenAI(
    {
        apiKey: 'sk-d5b24677b0e24f0da678029127102586',
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    }
);
//到时候请求-localhost:3000/llm?keyword="用户输入的问题" 
app.post("/llm", async (req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });
    console.log(req.body)
    const { keyword, userId, convertId } = req.body;
    const conversationObj = readConversation();
    const singleConvertList = conversationObj[userId][convertId].list;
    const queryObj = {
        role: "user",
        content: keyword
    };
    if (singleConvertList.length > 10) {
        //算出来要截取多少条
        //多截取一些，方便ai接口多给我们总结一下，所以设为6，每次大于10只保留6条。
        const removeNum = singleConvertList.length - 6;
        const removeList = singleConvertList.splice(1, removeNum)
        const summaryRes = await summaryMessage(openai, removeList);
        singleConvertList.splice(1, 0, summaryRes)
    }
    //每次提问，存到singleConvertList，保存上下文
    singleConvertList.push(queryObj);
    console.log(singleConvertList);
    const llmres = await openai.chat.completions.create({
        model: "gui-plus-2026-02-26",
        messages: [
            {
                role: "system",
                content: systemString
            },
            ...singleConvertList
        ],
        stream:true
    })
    // let chunkList = []
    let resObj  = {
        role:'assistant',
        id:'',
        content:''
    }
    for await (let chunk of llmres) {
        const delta = chunk.choices[0].delta
        
        resObj.id = chunk.id
        resObj.content += delta.content
        res.write(`data:${JSON.stringify(delta)}\n\n`)
        // chunkList.push(chunk)
    }
    // for of 结束了才会执行到下一行
    // fs.writeFileSync('./chunkList.json',JSON.stringify(chunkList))
    //每次回答，存到singleConvertList，保存上下文
    // singleConvertList.push(llmres.choices[0].message);
    singleConvertList.push(resObj)
    writeConversation(conversationObj)
    // res.json({
    //     success: true,
    //     data: llmres.choices[0].message
    // });
    res.write(`data:${JSON.stringify({done:true})}\n\n`)
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
app.get("/conversation/delete", async (req, res) => {
    const userId = req.query.userId
    const convertId = req.query.convertId
    const conversationObj = readConversation()
    const userAllConversation = conversationObj[userId]
    if(!userAllConversation || !userAllConversation[convertId]) {
        res.json({
            success:false,
            message:'对话不存在'
        })
        return
    }
    // 这一句就能删
    delete userAllConversation[convertId]
    writeConversation(conversationObj)
    res.json({
        success:true,
        message:'删除成功'
    })
});

// sse流失传输，关键修改头：'text/event-stream;'keep-alive'
// app.get("/ssetest", async (req, res) => {
//     res.writeHead(200, {
//         'Content-Type': 'text/event-stream; charset=utf-8',
//         'Cache-Control': 'no-cache',
//         'Connection': 'keep-alive',
//     });
//     const arr = ['你', '好', 'AI', '你', '能', '做什么']
//     let i = 0;
//     const timer = setInterval(() => {
//         if (i < arr.length) {
//             res.write(`data: ${JSON.stringify(arr[i])}\n\n`,);
//             i++;
//         } else {
//             console.log(123123)
//             clearInterval(timer)
//             res.write(`data: ${JSON.stringify({ done: true })}\n\n`,);
//             res.end();
//         }
//     }, 1000)
// })
//把服务开启来了开在了3000端口
app.listen(3000)