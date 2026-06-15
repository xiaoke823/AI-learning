//引入express-一个非常简单的node服务库
import express from "express";
import { getUserChatChain } from "./utils/chain.js";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatMessageHistory } from "@langchain/community/stores/message/in_memory";
import { HumanMessage, ToolMessage } from "@langchain/core/messages";
import { toolMap } from "./tools.js";
import { getUserHistory, writeUserHistory } from "./utils/index.js"
import { MyHistory } from "./MyHistory.js";

const app = express();

async function chatTo(q, userId, sessionId, type = 'human') {
    //本身拿到的是数组，需要转化
    let history = new MyHistory(userId, sessionId)
    const query = type === 'human' ? new HumanMessage(q) : new ToolMessage(q)
    //构建链条
    const chain = getUserChatChain(type)
    // histoory
    const runnableChat = new RunnableWithMessageHistory({
        runnable: chain,
        getMessageHistory() {
            return history
        },
        inputMessagesKey: type === 'human' ? "question" : "toolResult",
        historyMessagesKey: "history"
    })
    const invokeParams = {
        role: '聊天机器人'
    }
    if(type === 'human'){
        invokeParams.question = query.content
    }else {
        invokeParams.toolResult = [query]
    }
    const result = await runnableChat.invoke(invokeParams, {
        configurable: { sessionId: 'default' }
    });
    return result
}

app.get("/llm", async (req, res) => {
    //获取用户体的问题
    const { q, userId, sessionId } = req.query;
    let result = await chatTo(q, userId, sessionId)
    if (result.tool_calls && result.tool_calls.length > 0) {
        for await (const tool of result.tool_calls) {
            const toolName = tool.name;
            const toolResult = await toolMap[toolName].invoke(tool.args)

            result = await chatTo({
                content: toolResult,
                tool_call_id: tool.id
            }, userId, sessionId, "tool")
        }
    }
    //返回给前端
    res.send(result.content);
});

app.listen(3000)