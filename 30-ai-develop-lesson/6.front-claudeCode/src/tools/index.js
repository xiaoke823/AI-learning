//把本地和mcp合并成一个最终的
import { linkMcpAndListTool } from "./mcp/index.js"
import getLocalTool from "./local/index.js"
const { localTools, localMap } = getLocalTool();


//初始只有本地的工具
const tools = [...localTools];
const toolNameMap = {
    ...localMap,
}

// MCP 连接是异步过程：启动时立即发起，并用 mcpReady 记录其完成时机。
// app.js 进入交互界面前需 await ready()，确保 tools 列表已包含 MCP 工具，
// 否则第一轮请求大模型时模型拿不到 MCP 工具定义，会误以为没有这些工具。
const mcpReady = linkMcpAndListTool(tools, toolNameMap)

// 供 app.js 启动时等待 MCP 连接完成
export async function ready() {
    await mcpReady
}

export async function excuteTool(name, args) {
    // 执行工具前再兜底等待一次，防止启动初期竞态
    await mcpReady
    const result = await toolNameMap[name].callTool({
        name: name,
        arguments: args
    });
    //返回文本出去
    return result.content[0].text
}


export default {
    tools,
    toolNameMap
}
