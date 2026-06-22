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
 * 支持函数工具(function calling)：传入 tools 与 toolMap 时，自动执行模型请求调用的工具并把结果回传，循环直到模型给出最终文本
 * @param {Array<{role: string, content: string}>} messages 对话历史（工具调用过程中的中间消息会追加到此数组，但不会写入外部对话历史）
 * @param {{tools?:Array<object>, toolMap?:Record<string,(args:object)=>string>}} [options] 工具配置：tools 为工具定义数组，toolMap 为工具名到执行函数的映射
 * @returns {Promise<string>} 模型回复内容
 */
export async function chatWithModel(messages, options = {}) {
  const { tools = [], toolMap = {} } = options
  const settings = readSettings()
  // 每次请求创建客户端实例
  const client = createClient()
  // 限定最大工具调用轮数，避免模型无限调用工具造成死循环
  const MAX_TOOL_ROUNDS = 10
  for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
    const reqParams = { model: settings.model, messages }
    // 仅在提供了工具时才附带 tools 字段，避免不支持工具调用的接口报错
    if (tools.length) reqParams.tools = tools
    const completion = await client.chat.completions.create(reqParams)
    const message = completion.choices[0]?.message
    // 模型未请求调用工具：直接返回最终文本
    if (!message?.tool_calls?.length) {
      return message?.content ?? ''
    }
    // 模型请求调用工具：先把含 tool_calls 的助手消息并入历史（OpenAI 要求 tool 结果消息前必须有对应的助手消息），再逐个执行工具并把结果作为 tool 消息回传
    messages.push(message)
    for (const call of message.tool_calls) {
      const fn = toolMap[call.function.name]
      let result
      try {
        const args = JSON.parse(call.function.arguments || '{}')
        result = fn ? fn(args) : `工具 ${call.function.name} 不存在`
      } catch (err) {
        result = `工具执行出错：${err.message}`
      }
      messages.push({ role: 'tool', tool_call_id: call.id, content: String(result) })
    }
    // 带上工具结果进入下一轮，让模型继续生成
  }
  // 达到最大轮数模型仍在调用工具：返回空串，避免死循环
  return ''
}
