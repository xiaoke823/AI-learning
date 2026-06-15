//引入express-一个非常简单的node服务库
import express from "express";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { getUserChatChain } from "./utils/chain.js";
import { ChatMessageHistory } from "@langchain/community/stores/message/in_memory";
import { getUserHistory, writeUserHistory } from "./utils/index.js";
const app = express();

//准备一个数组来储存对话记录
let history = new ChatMessageHistory();
app.get("/llm", async (req, res) => {
    //获取用户体的问题
    const { q, userId, seesionId } = req.query;
    //获取用户记录
    const _historyArr = getUserHistory(userId, seesionId);
    //不能直接给_historyArr，要转化成ChatMessageHistory才能作为history
    history = new ChatMessageHistory(_historyArr);
    //拿链条
    const chain = getUserChatChain();
    const runablechat = new RunnableWithMessageHistory({
        runnable: chain, 
        getMessageHistory() {
            return history
        },
        inputMessagesKey: "question",
        historyMessagesKey: "history"
    })
    const result = await runablechat.invoke({
        role: "聊天机器人",
        question: q
    }, {
        configurable: { sessionId: "default" }
    })
    //在本次问答结束后打印一下history的记录
    //history.getMessages()
    writeUserHistory(userId, seesionId, history.messages)
    res.send(result);
});

app.listen(3000)