import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
@Injectable()
export class McpClientService implements OnModuleInit, OnModuleDestroy {


    private client: Client;
    private transport: StdioClientTransport;

    // 真正向 server 查询工具列表（对应 MCP 协议的 tools/list 请求）
    async listTools() {
        const result = await this.client.listTools()
        // result.tools 是 server 注册的全部工具，每项形如：
        // { name, description, inputSchema: { ...JSON Schema... } }
        return result.tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
        }))
    }

    // 真正调用 server 上的某个工具（对应 MCP 协议的 tools/call 请求）
    async callTool(name: string, args: Record<string, any>) {
        const result = await this.client.callTool({
            name,
            arguments: args,
        })
        // server 返回的 content 是数组：MCP 工具结果可以是多段（text/image/resource...）
        // 我们写的 server 全是文本返回，这里提取第一段 text
        const text = result.content?.[0]?.text ?? ''
        return {
            toolName: name,
            result: text,
            isError: result.isError ?? false,
        }
    }

    async onModuleInit() {
        console.log('McpClientService initialized')
        this.client = new Client({
            name: 'nestjs-demo-mcp-client',
            version: '1.0.0',
        })
        // ① stdio 模式下，Client 是父进程，要 spawn 一个 Server 子进程来通信
        //    这里告诉 transport：用什么命令把 server 拉起来
        this.transport = new StdioClientTransport({
            command: 'npx',
            args: ['tsx', 'src/mcp-server/server.ts'],
            env: {
                ...process.env,
            } as Record<string, string>,
        })
        // ② connect 会真正 spawn 子进程、完成 MCP initialize 握手
        //    给它加 15 秒超时兜底：npx tsx 首次要下载、server 内部要初始化 Prisma，启动可能偏慢
        await Promise.race([
            this.client.connect(this.transport),
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error('连接 server 超时（15s）')), 15000),
            ),
        ])
        // ③ 这是 NestJS(Client)进程的日志，不受 MCP 协议占用，可以正常 console.log
        //    （只有 server 子进程的 stdout 才被协议独占，那里才只能用 console.error）
        console.log('[MCP Client] 已连接到 server')
    }

    async onModuleDestroy() {
        // 关闭 client：会同时关闭 transport，并把 spawn 的 server 子进程一起停掉
        // 不关的话，server 子进程会变成孤儿进程继续占用（还占着数据库连接）
        await this.client?.close()
        console.log('[MCP Client] 已断开连接')
    }
}
