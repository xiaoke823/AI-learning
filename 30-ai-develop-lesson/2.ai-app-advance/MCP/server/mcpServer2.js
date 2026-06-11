import express from 'express';
import cors from 'cors';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import z from "zod"//js里用来说明类型的库
const PORT = 3002;
const app = express();
// 中间件配置
app.use(cors()); // 跨域支持
app.use(express.json()); // 解析JSON格式的请求体

app.post('/mcp', async (req, res) => {

    const server = new McpServer({
        name: "mymcp",
        version: "1.0.0"
    })
    //一定要在connect之前注册
    server.registerTool("open_safe", {
        type: "function",
        description: "当用户需要打开某个软件时调用",
        inputSchema: {
            safeName: z.string().describe("用户要打开的软件").optional()
        },
        // outputSchema: {
        //     a: z.number
        // }
    }, async (arg) => {
        console.log(arg, 'sdwewe')
        return {
            content: [
                {
                    type: "text",
                    text: `已经为你打开${arg.safeName}`
                }
            ]
        }
    })
    //接下你就可以基于server对象，设置function tool之类的上下文，今天先略过
    const transport = new StreamableHTTPServerTransport()
    await server.connect(transport)

    await transport.handleRequest(req, res, req.body)
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器已启动，运行在 http://localhost:${PORT}`);
});