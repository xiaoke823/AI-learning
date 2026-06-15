import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { mcpConfig } from "./mcpConfig.js";

// 1. 配置并连接MCP服务器
const client = new MultiServerMCPClient({
    prefixToolNameWithServerName: true,
    additionalToolNamePrefix: "mcp",
    mcpServers: mcpConfig
});


function findTool(tools, toolName) {
    // 支持精确匹配或部分匹配
    return tools.find(tool =>
        tool.name === toolName ||           // 精确匹配
        tool.name.endsWith(toolName) ||     // 后缀匹配（如果有前缀）
        tool.name.includes(toolName)        // 包含匹配
    );
}


// 2. 获取所有工具
const tools = await client.getTools();


// 3. 假设大模型要掉这个工具
const name = 'mcp__chrome-devtools__new_page'
const targetTool = findTool(tools, name)
console.log(targetTool.schema)
const toolResult = await targetTool.invoke({ url: "http://localhost:5173/" })
console.log(toolResult)
// 4. 关闭连接
await client.close();