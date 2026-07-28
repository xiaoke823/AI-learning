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

// ══════════════════════════════════════════════════════
// 模拟数据（实际项目应来自数据库）
// 提取为模块级常量，避免在多个工具中重复定义、保持价格一致
// ══════════════════════════════════════════════════════

interface Product {
    stock: number;
    price: number;
    category: string;
}

const PRODUCTS: Record<string, Product> = {
    "apple": { stock: 100, price: 10, category: "fruit" },
    "banana": { stock: 200, price: 20, category: "fruit" },
    "orange": { stock: 300, price: 30, category: "fruit" },
    "pear": { stock: 400, price: 40, category: "fruit" },
    "pineapple": { stock: 500, price: 50, category: "fruit" },
    "iphone 16": { stock: 2000, price: 2000, category: "phone" },
    "iphone 16 pro": { stock: 3000, price: 3000, category: "phone" },
    "iphone 15": { stock: 2000, price: 1000, category: "phone" },
    "iphone 15 pro": { stock: 3000, price: 2000, category: "phone" },
    "iphone 15 pro max": { stock: 4000, price: 3000, category: "phone" },
}

/**
 * 商品名归一化查找：
 *  - 兼容大小写 / 前后空格
 *  - 兼容 "Apple iPhone 15" 这类带品牌前缀的输入（模糊匹配到 "iphone 15"）
 *  - 按 key 长度降序匹配，保证 "iphone 15 pro" 优先于 "iphone 15"
 * 实际项目应替换为数据库的模糊搜索
 */
function findProduct(rawName: string): Product | undefined {
    const normalized = rawName.toLowerCase().trim()
    if (PRODUCTS[normalized]) return PRODUCTS[normalized]
    const matched = Object.keys(PRODUCTS)
        .sort((a, b) => b.length - a.length)
        .find(k => normalized.includes(k))
    return matched ? PRODUCTS[matched] : undefined
}

// 订单状态池（用于模拟随机查询结果）
const ORDER_STATUSES = ["已支付", "已发货", "已收货", "已退货", "已取消"]

// Agent 系统提示词
const SYSTEM_PROMPT = `你是一个电商平台AI智能客服助手，负责回答用户的问题，
帮助用户查询商品库存、创建订单、查询订单状态、申请退款。
你可以使用工具来帮助客户解决问题，工具列表如下：
- checkProductStock：查询商品库存，输入参数为商品名称，输出为一个字符串，包含商品库存、价格、分类等信息。
- createOrder：创建订单，输入参数为商品名称、数量、客户名称，输出为一个字符串，包含订单创建的结果。
- checkOrderStatus：查询订单状态，输入参数为订单ID，输出为一个字符串，包含订单状态的结果。
- applyRefund：申请退款，输入参数为订单ID、退款理由，输出的结果是一个字符串，包含退款申请的结果。
工作流程示例：
1. 先用工具获取真实信息，再给用户回复
2. 如果工具无法获取真实信息，请告诉用户无法获取真实信息
3. 下单前，先检查商品库存是否充足，如果库存不足，请告诉用户库存不足
4. 下单后，请告诉用户订单创建成功，订单ID是多少
5. 订单创建成功后，请告诉用户订单状态是多少
6. 订单状态是已支付，请告诉用户订单已支付
7. 订单状态是已发货，请告诉用户订单已发货
8. 订单状态是已收货，请告诉用户订单已收货
9. 订单状态是已退货，请告诉用户订单已退货
10. 订单状态是已取消，请告诉用户订单已取消
11. 如果用户申请退款，请告诉用户退款申请成功，退款ID是多少
12. 回答简洁明了，使用中文`

// Agent 最大循环轮数（防止死循环）
const MAX_ROUNDS = 6

@Injectable()
export class AgentsService {
    // 首先创建模型实例，这里使用的是 ollama 的 API
    private llm = new ChatOllama({
        model: config.ollama.chatModel,
        temperature: config.ollama.temperature,
        baseUrl: config.ollama.host, // 服务地址
        think: false, // 是否开启 think 模式，即是否在模型中运行代码
        numPredict: 512, // 预测的长度，即模型返回的答案
    })

    // ══════════════════════════════════════════════════════
    // 工具定义
    // tool() 把普通 JS 函数包装成模型能识别的格式
    //   name：工具名（模型据此决定何时调用）
    //   description：工具描述（模型据此理解这个工具能干什么）
    //   schema：参数定义（zod 格式，告诉模型调用时传什么参数）
    // ══════════════════════════════════════════════════════

    // 工具1：查询商品库存
    private checkProductStockTool = tool(
        ({ productName }: { productName: string }) => {
            const product = findProduct(productName)
            if (!product) {
                return `商品 ${productName} 不存在`
            }
            if (product.stock === 0) {
                return `商品 ${productName} 库存为 0`
            }
            return `商品 ${productName} 库存为 ${product.stock}，价格为 ${product.price}，分类为 ${product.category}`
        },
        {
            name: "checkProductStock",
            description: "查询商品库存，如果商品不存在或库存为0，返回商品不存在或库存为0",
            schema: z.object({
                productName: z.string().describe("要查询的商品名称")
            })
        }
    )

    // 工具2：创建订单
    private createOrderTool = tool(
        ({ productName, quantity, customerName }:
            { productName: string, quantity: number, customerName: string }) => {
            const product = findProduct(productName)
            if (!product) {
                return `商品 ${productName} 不存在`
            }

            const totalPrice = product.price * quantity
            const orderId = `Order-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
            return `订单创建成功，订单ID：${orderId}，商品名称：${productName}，数量：${quantity}，客户名称：${customerName}，总价：${totalPrice}`
        },
        {
            name: "createOrder",
            description: "创建订单的工具，需要提供商品名称、数量、客户名称，输出的结果是一个字符串，包含订单创建的结果",
            schema: z.object({
                productName: z.string().describe("要创建订单的商品名称"),
                quantity: z.number().describe("要创建订单的数量"),
                customerName: z.string().describe("要创建订单的客户名称")
            })
        }
    )

    // 工具3：查询订单状态
    private queryOrderStatusTool = tool(
        ({ orderId }: { orderId: string }) => {
            // 从状态池中随机返回一个状态（模拟真实查询）
            const status = ORDER_STATUSES[Math.floor(Math.random() * ORDER_STATUSES.length)]
            return `订单状态查询成功，订单ID：${orderId}，订单状态：${status}`
        },
        {
            name: "checkOrderStatus",
            description: "查询订单状态的工具，需要提供订单ID，输出的结果是一个字符串，包含订单状态的结果",
            schema: z.object({
                orderId: z.string().describe("要查询的订单ID")
            })
        }
    )

    // 工具4：申请退款
    private applyRefundTool = tool(
        ({ orderId, reason }: { orderId: string, reason: string }) => {
            return `退款申请成功，订单ID：${orderId}，退款原因：${reason}`
        },
        {
            name: "applyRefund",
            description: "申请退款的工具，需要提供订单ID、退款理由，输出的结果是一个字符串，包含退款申请的结果",
            schema: z.object({
                orderId: z.string().describe("要申请退款的订单ID"),
                reason: z.string().describe("要申请退款的理由")
            })
        }
    )

    // 所有工具集合（顺序即模型看到的顺序）
    private tools = [
        this.checkProductStockTool,
        this.createOrderTool,
        this.queryOrderStatusTool,
        this.applyRefundTool,
    ]


    async runAgent(userMessage: string) {
        // 工具名 -> 工具实例 的映射，供循环中按名查找
        // 从 tools 自动生成，避免手写维护导致与数组不同步
        const toolMap: Record<string, StructuredToolInterface> =
            Object.fromEntries(this.tools.map(t => [t.name, t]))

        // 绑定工具 返回一个新模型，这个模型可以调用工具
        const llmWithTools = this.llm.bindTools(this.tools)

        const messages: BaseMessage[] = [
            new SystemMessage(SYSTEM_PROMPT),
            new HumanMessage(userMessage),
        ]

        // 记录每步执行过程（用于前端展示 / 课程演示）
        const steps: string[] = []
        let roundCount = 0

        // ── Agent 循环 ──────────────────────────────────────
        // 每一轮：模型看消息历史 → 决定调用工具还是直接回答
        // 直到模型不再调用工具为止（最多 MAX_ROUNDS 轮，防止死循环）
        while (roundCount < MAX_ROUNDS) {
            roundCount++
            console.log(`\n[Agent 第 ${roundCount} 轮]`)

            const response = await llmWithTools.invoke(messages) as AIMessage
            messages.push(response)  // 把模型回复加入历史

            // tool_calls 为空 → 模型有了最终答案，退出循环
            if (!response.tool_calls || response.tool_calls.length === 0) {
                steps.push(`💬 [最终回答] ${response.content}`)
                break
            }

            // 模型决定调用工具，依次执行所有工具调用
            for (const toolCall of response.tool_calls) {
                steps.push(`🔧 [调用工具] ${toolCall.name}(${JSON.stringify(toolCall.args)})`)
                console.log(`[工具调用] ${toolCall.name}`, toolCall.args)

                const toolFn = toolMap[toolCall.name]
                if (!toolFn) {
                    const errMsg = `工具「${toolCall.name}」不存在`
                    steps.push(`❌ [错误] ${errMsg}`)
                    messages.push(new ToolMessage({ content: errMsg, tool_call_id: toolCall.id ?? '' }))
                    continue
                }

                // 执行工具，获取结果
                // 捕获参数校验失败（如模型把 productName 写成 name）和工具内部异常，
                // 把错误信息作为工具结果反馈给模型，让它在下一轮自我修正后重试
                let toolResult: string
                try {
                    toolResult = await toolFn.invoke(toolCall.args)
                } catch (err) {
                    toolResult = `⚠️ 工具执行失败：${err instanceof Error ? err.message : String(err)}。请检查参数名与类型是否符合工具定义后重试。`
                }
                steps.push(`✅ [工具结果] ${toolResult}`)
                console.log(`[工具结果] ${toolResult}`)

                // 把工具结果加入消息历史
                // 模型下一轮看到结果后，再决定继续调工具还是直接回答
                messages.push(
                    new ToolMessage({
                        content: String(toolResult),
                        tool_call_id: toolCall.id ?? '',
                    }),
                )
            }
        }


        // 获取最终回答（最后一条 AIMessage 的内容）
        const lastAI = [...messages].reverse().find((m): m is AIMessage => m instanceof AIMessage)

        return {
            userMessage,
            steps,            // 完整思考和执行步骤（录视频演示重点）
            totalRounds: roundCount,
            answer: lastAI?.content ?? '抱歉，暂时无法处理您的请求，请稍后再试',
        }
    }
}
