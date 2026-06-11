import express from 'express';
import cors from 'cors';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"
import z from "zod"//js里用来说明类型的库
const PORT = 3001;
const app = express();
// 中间件配置
app.use(cors()); // 跨域支持
app.use(express.json()); // 解析JSON格式的请求体

app.post('/mcp', async (req, res) => {

    const server = new McpServer({
        name: "mymcp",
        version: "1.0.0"
    })
    //server一定要在connect前注册
    server.registerTool('help_dp',{
        type:'function',
        description:'当用户需要订票的时候调用此工具',
        inputSchema:{
            city:z.string().describe("用户要去的城市").optional()
        }
    },async (arg)=>{
        return {
            content:[
                {
                    type:'text',
                    text:`去往${arg.city}的票订购成功`
                }
            ]
        }
    })
    const transport = new StreamableHTTPServerTransport()
    await server.connect(transport)

    await transport.handleRequest(req, res, req.body)
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器已启动，运行在 http://localhost:${PORT}`);
});