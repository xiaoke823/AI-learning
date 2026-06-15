//引入express-一个非常简单的node服务库
import express from "express";
import { getUserChatChain } from "./utils/chain.js";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ChatMessageHistory } from "@langchain/community/stores/message/in_memory";
import { AIMessage, HumanMessage, mapChatMessagesToStoredMessages, ToolMessage } from "@langchain/core/messages";
import { toolMap } from "./tools.js";
import { getUserHistory, writeUserHistory } from "./utils/index.js"
import { MyHistory } from "./MyHistory.js";
import fs from "fs"

const app = express();

async function chatTo(q, userId, sessionId, res, type = 'human') {
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
    //改为流式传输只需要invoke 改为stream
    const result = await runnableChat.stream(invokeParams, {
        configurable: { sessionId: 'default' }
    });

    //处理流失传输，还是要自己拼chunk
    //push数组只是为了方便查看chunk，对于功能没用的
    let arrChunk = []
    //方便mapChatMessagesToStoredMessages去做存储，所以new一个AImessage
    let answer = new AIMessage('')
    let toolCallObj = null
    for await (let chunk of result) {
        if(chunk.content){
            answer.content += chunk.content
            res.write(`data: ${JSON.stringify(mapChatMessagesToStoredMessages([answer]))}\n\n`)
        }
        if(chunk.tool_call_chunks[0]){
            if(toolCallObj){
                const _chunks = chunk.tool_call_chunks[0]
                toolCallObj.id += _chunks.id? _chunks.id:""
                toolCallObj.name += _chunks.name? _chunks.name:""
                toolCallObj.args += _chunks.args? _chunks.args:""
            }else {
                toolCallObj = chunk.tool_call_chunks[0]
            }
            
        }
    }
    //判断tool是否存在，存在则执行
    if(toolCallObj&&toolCallObj.id){
        const toolName = toolCallObj.name;
        const toolResult = await toolMap[toolName].invoke(JSON.parse(toolCallObj.args))

        result = await chatTo({
            content: toolResult,
            tool_call_id: toolCallObj.id
        }, userId, sessionId,res,"tool")
    }
    console.log(toolCallObj)

    fs.writeFileSync('./chunk.json',JSON.stringify(arrChunk))

    //返回给前端
    res.end();
    return result
}

app.get("/llm", async (req, res) => {
    //sse响应头
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    //获取用户体的问题
    const { q, userId, sessionId } = req.query;
    let result = await chatTo(q, userId, sessionId,res)

    
});

app.listen(3000)