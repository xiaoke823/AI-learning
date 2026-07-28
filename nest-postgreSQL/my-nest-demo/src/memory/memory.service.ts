import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { config } from 'src/config';
import { tool, StructuredToolInterface } from '@langchain/core/tools';
import { z } from 'zod';
import {
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
} from '@langchain/core/messages';
import { Response } from 'express';

@Injectable()
export class MemoryService {
    // 首先创建模型实例，这里使用的是 ollama 的 API
    private llm = new ChatOllama({
        model: config.ollama.chatModel,
        temperature: config.ollama.temperature,
        baseUrl: config.ollama.host, // 服务地址
        think: false, // 是否开启 think 模式，即是否在模型中运行代码
        numPredict: 512, // 预测的长度，即模型返回的答案
    })

    private sessions = new Map<string, BaseMessage[]>();
    private systemMessage = new SystemMessage('')

    private getOrCreate(sessionId: string): BaseMessage[] {
        if (!this.sessions.has(sessionId)) {
            // 新会话，创建一个会话，并设置系统消息
            this.sessions.set(sessionId, [this.systemMessage])
        }
        return this.sessions.get(sessionId)!
    }


    async chat(sessionId: string, message: string) {
        const history = this.getOrCreate(sessionId);
        history.push(new HumanMessage(message));
        const response = await this.llm.invoke(history);
        history.push(response);
        return {
            history,
            response: response.content,
            sessionId,
            message,
            turn: (history.length - 1) / 2, //对话轮数，因为每轮对话有2条消息，所以除以2
        }
    }


    // ── 多轮对话（SSE 流式版本）──────────────────────────
    async chatStream(sessionId: string, message: string, res: Response) {
        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-cache')
        res.setHeader('Connection', 'keep-alive')
        res.setHeader('Access-Control-Allow-Origin', '*')

        const history = this.getOrCreate(sessionId)
        history.push(new HumanMessage(message))

        let fullReply = ''

        const stream = await this.llm.stream(history)
        for await (const chunk of stream) {
            if (chunk.content) {
                const text = String(chunk.content)
                fullReply += text
                res.write(`data: ${JSON.stringify({ text, sessionId })}\n\n`)
            }
        }

        // 流结束后把完整回复存入历史
        history.push(new AIMessage(fullReply))
        res.write(`data: ${JSON.stringify({ text: '[DONE]', turns: Math.floor((history.length - 1) / 2) })}\n\n`)
        res.end()
    }

    // ── 查看会话历史 ──────────────────────────────────────
    getHistory(sessionId: string) {
        const history = this.sessions.get(sessionId)
        if (!history) return { sessionId, exists: false, messages: [] }

        const messages = history
            .filter(m => !(m instanceof SystemMessage))
            .map((m, i) => ({
                index: i + 1,
                role: m instanceof HumanMessage ? 'user' : 'assistant',
                content: m.content,
            }))

        return {
            sessionId,
            exists: true,
            turns: Math.floor(messages.length / 2),
            messages,
        }
    }

    // ── 清空会话 ──────────────────────────────────────────
    clearSession(sessionId: string) {
        if (!this.sessions.has(sessionId)) {
            return { sessionId, cleared: false, message: '会话不存在' }
        }
        this.sessions.set(sessionId, [this.systemMessage])
        return { sessionId, cleared: true, message: '会话已清空' }
    }

    // ── 所有会话列表 ──────────────────────────────────────
    listSessions() {
        const sessions = Array.from(this.sessions.entries()).map(([id, h]) => ({
            sessionId: id,
            turns: Math.floor((h.length - 1) / 2),
        }))
        return { total: sessions.length, sessions }
    }
}
