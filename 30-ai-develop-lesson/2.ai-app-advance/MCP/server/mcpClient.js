import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"


const client = new Client({
    name: "sdw",
    version: "1.0.0"
});
const transport = new StreamableHTTPClientTransport('http://localhost:3001/mcp');
await client.connect(transport);

const res = await client.listTools()
const openaiType = transformToOpenAi(res)
// console.log(JSON.stringify(openaiType))

const res2 = await client.callTool({
    name:'help_dp',
    arguments:{city:'长沙'}
})

console.log(res2)

function transformToOpenAi(res){
    const tools = res.tools
    const openTools = tools.map((item)=>{
        const funcitonObj= {}
        funcitonObj.name = item.name
        funcitonObj.description = item.description
        funcitonObj.parameters = item.inputSchema
        return {
            type:'function',
            function:funcitonObj
        }
    })
    return openTools
}


