//引入express-一个非常简单的node服务库
import express from "express";
import { getUserChatChain } from "./utils/chain.js";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatMessageHistory } from "@langchain/community/stores/message/in_memory";

import { getUserHistory, writeUserHistory } from "./utils/index.js"
import { MyHistory } from "./MyHistory.js";

const app = express();

//准备一个数组来储存对话记录
// let history = new MyHistory()
app.get("/llm", async (req, res) => {
    //获取用户体的问题
    const { q, userId, sessionId } = req.query;
    //本身拿到的是数组，需要转化
    let history = new MyHistory(userId,sessionId)
    
    //构建链条
    const chain = getUserChatChain()
    // histoory
    const runnableChat = new RunnableWithMessageHistory({
        runnable:chain,
        getMessageHistory(){
            return history
        },
        inputMessagesKey:"question",
        historyMessagesKey:"history"
    })

    const result = await runnableChat.invoke({
        role:'聊天机器人',
        question:q
    },{
        configurable:{sessionId:'default'}
    });
    //返回给前端
    res.send(result);
});

app.listen(3000)