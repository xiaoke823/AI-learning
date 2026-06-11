import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const client = new Client({
    name: "mycl",
    version: "1.0.0"
})
const transport = new StdioClientTransport({
    command: "mylocalmcp",
    //npx-免下载的运行一个npm包 uv-py界的npx
    // args: ['stdioMcpServer.js']
})
await client.connect(transport)
const res = await client.listTools();
const res2 = await client.callTool({
    name: "open_postman"
})
console.log(res2);