//封装大模型请求：基于 openai SDK，兼容 OpenAI 及各类兼容协议
//配置来源：当前终端目录下的 .front-claude/settings.json（首次使用会交互式引导填写）
import OpenAI from 'openai'
import { readSettings } from './settings.js'

/**
 * 创建 OpenAI 客户端实例的工厂方法，配置从 .front-claude/settings.json 读取
 * @returns {OpenAI} OpenAI 客户端实例
 */
export function createClient() {
  const settings = readSettings()
  return new OpenAI({
    apiKey: settings.apiKey,
    baseURL: settings.baseURL,
  })
}

/**
 * 根据对话历史请求大模型，返回模型的回复文本
 * @param {Array<{role: string, content: string}>} messages 对话历史
 * @returns {Promise<string>} 模型回复内容
 */
export async function chatWithModel(messages) {
  const settings = readSettings()
  // 每次请求创建客户端实例
  const client = createClient()
  const completion = await client.chat.completions.create({
    model: settings.model,
    messages,
  })
  // 取出第一条回复内容
  const reply = completion.choices[0]?.message?.content ?? ''
  return reply
}
