import { Client } from "@modelcontextprotocol/sdk/client/index.js"

import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
const API_KEY = "sk-7d8dee72a49f49729567c1b08b4660b7"
const mcpurl = 'https://mcpmarket.cn/mcp/67f270fe36e5587add805ea5'
const client = new Client({
    name: "sdw",
    version: "1.0.0"
});
const transport = new StreamableHTTPClientTransport(mcpurl)

await client.connect(transport);
const res = await client.listTools();

console.log(res);


