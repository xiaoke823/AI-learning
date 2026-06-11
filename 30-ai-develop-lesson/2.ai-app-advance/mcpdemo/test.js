import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const API_KEY = "sk-7d8dee72a49f49729567c1b08b4660b7"
const mcpUrl = 'https://dashscope.aliyuncs.com/api/v1/mcps/WebSearch/mcp'
const client = new Client({
    name:'sadf',
    version:'1.0.0'
})
const transport = new StreamableHTTPClientTransport(new URL(mcpUrl),{
    requestInit:{
        headers:{
            "Authorization": `Bearer ${API_KEY}`
        }
    }
})

await client.connect(transport)

const list = await client.listTools();
const res = await client.callTool({
    name:'bailian_web_search',
    arguments:{
        query:'北京天气如何'
    }
})
console.log(res)