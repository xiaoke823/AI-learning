import express from "express";
import { getGraph } from "./utils/getGraph.js";
import { getUserHistory, writeUserHistory } from "./utils/chat.js";
import { mapChatMessagesToStoredMessages, mapStoredMessagesToChatMessages } from "@langchain/core/messages";
import fs from "fs"

const graph = getGraph();
const app = express();

const PORT = 3000;

app.get("/llm", async (req, res) => {
    try {
        const { q, userId, sessionId } = req.query;

        // 设置 SSE 响应头
        res.writeHead(200, {
            'Content-Type': 'text/event-stream;charset=utf-8',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        //根据id先查找记录
        // const history = getUserHistory(userId, sessionId)
        const stream = await graph.stream(
            {
                messages: [
                    // ...mapStoredMessagesToChatMessages(history),
                    {
                        role: "user",
                        content: q,
                    },
                ],
            },
            {
                configurable: {
                    userId,
                    sessionId
                },
                streamMode: 'messages'
            }
        );
        const arr = []
        // 遍历流式输出
        for await (const chunk of stream) {
            arr.push(chunk);
            // arr.push(lastMessage);
            if (chunk[0].content) {
                res.write(`data: ${chunk[0].content}\n\n`);
            }
        }
        fs.writeFileSync("./a.json", JSON.stringify(arr))
        // 发送结束信号
        res.write(`data: [DONE]\n\n`);
        res.end();

        // writeUserHistory(userId, sessionId, mapChatMessagesToStoredMessages(result.messages))
    } catch (error) {
        console.error("Error:", error);
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
    }
});

app.listen(PORT, () => {
    console.log(`服务已启动: http://localhost:${PORT}`);

});
