const API_KEY = "sk-7d8dee72a49f49729567c1b08b4660b7"
export const mcpList = [
    {
        name: "mymcp",
        type: "streamablehttp",
        url: " http://localhost:3001/mcp"
    },
    {
        url: "http://localhost:3002/mcp",
        type: "streamablehttp",
        name: "mymcp2"
    },
    {
        name: "bailian_web_search",
        type: "streamablehttp",
        url: 'https://dashscope.aliyuncs.com/api/v1/mcps/WebSearch/mcp',
        header: {
            'Authorization': `Bearer ${API_KEY}`
        }
    },
    {
        name: "chrome-devtools",
        type: "stdio",
        commandArg: {
            command: "npx",
            args: ["chrome-devtools-mcp@latest"]

        }
    }
]