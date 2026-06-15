export const mcpConfig = {
    "chrome-devtools": {
        "transport": "stdio",
        "command": "npx",
        "args": [
            "chrome-devtools-mcp@latest"
        ]
    },
    "time": {
        "transport": "http",  // 或 "http"
        "url": "https://mcpmarket.cn/mcp/67f270fe36e5587add805ea5",
    },
    "bailian_web_search": {
        "transport": "http",
        "url": 'https://dashscope.aliyuncs.com/api/v1/mcps/WebSearch/mcp',
        "headers": {
            'Authorization': "Bearer sk-7d8dee72a49f49729567c1b08b4660b7"
        }
    }
}

