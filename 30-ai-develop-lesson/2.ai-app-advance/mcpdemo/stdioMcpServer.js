#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { exec } from 'child_process';
const server = new McpServer({
    name: "mylocal",
    version: "1.0.0"
})
server.registerTool("open_postman", {
    description: "打开用户的本地postman"
}, () => {
    const path = 'C:/Users/Administrator/AppData/Local/Postman/Postman.exe'
    exec(`start "" "${path}"`, (error) => {
        if (error) {
            console.error('启动失败，请确认路径是否正确');
        } else {
            console.log('Postman启动成功！');
        }
    });
    return {
        content: [
            {
                type: "text",
                text: "打开成功"
            }
        ]
    };

    //通过js打开用户本地的postman
})
const transport = new StdioServerTransport()
await server.connect(transport); 