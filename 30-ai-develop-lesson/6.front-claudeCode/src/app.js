//整个项目的启动入口
import './utils/env.js' // 加载项目自带的 .env 环境变量（与运行时目录无关）
import ora from 'ora'
import { chatWithModel } from './utils/model.js'
import { ensureSettings } from './utils/settings.js' // 首次使用引导 / 读取模型配置
import logger from './utils/logger.js' // 带颜色的终端输出
import showWelcome from './utils/init.js'
import { saveHistory } from './utils/memory.js'
import { InputBox } from './ui/inputBox.js' // 自定义输入控件（接管按键 + / 与 @ 菜单）
import { runCommand } from './commands/index.js' // 内置指令定义与执行
import { buildContext } from './files/index.js' // @ 文件上下文解析
import { readSystem, getUserContext, readRules, getSkillHeaders } from './utils/contextRead.js' // 读取系统提示词与用户上下文模板并填充运行时信息
import { getMatchedRules } from './utils/rulesMatch.js' // 根据 @ 文件匹配 .front-claude/rules 规则
import path from 'node:path'
import toolResult, { ready as toolsReady } from './tools/index.js' // 工具能力（本地 function tool + MCP，已归一化）：整体交给 model.js，由它转格式并执行；ready 用于等待 MCP 连接完成

// 对话历史，后续接入大模型时作为上下文传入接口
const messages = []
// 系统提示词：包含操作系统信息与工作目录，随请求作为 system 上下文发送，但不写入对话历史
const systemPrompt = readSystem()
// 用户上下文：用户主目录与项目目录下的自定义要求，作为 user 级单独随请求发送，不写入对话历史
const userContext = getUserContext()
// 规则引入
const ruleMap = readRules()
// skill引入
const skill = getSkillHeaders()

// 组装发送给大模型的消息序列：系统提示词 → skill 能力说明 → 用户上下文 → 对话历史
// systemPrompt / skill / userContext 均为临时上下文，每次请求拼接但不写入 messages，故不会进入对话历史
function buildRequestMessages() {
    return [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContext },
        { role: 'user', content: skill },
        ...messages,
    ]
}

// 处理一次对话：把用户问题发给大模型，打印回复并记录到对话历史
async function chat(userInput) {
    // 记录用户消息（命中的规则已合并进 userInput，故会一并写入对话历史）
    messages.push({ role: 'user', content: userInput })
    // 加载动画：discardStdin: false 避免吞掉输入
    const spinner = ora({ text: 'AI 正在思考...', discardStdin: false }).start()
    try {
        // 请求大模型：system 上下文在前；用户上下文作为 user 级单独传入（临时拼接，不写入 messages，故不会被保存进对话记录）
        // 带上归一化后的工具集（toolResult），模型可在需要时调用，由 model.js 转格式并通过 excuteTool 执行后继续生成
        const reply = await chatWithModel(buildRequestMessages(), { toolResult })
        // 记录助手回复，作为下一轮的上下文
        messages.push({ role: 'assistant', content: reply })
        spinner.stop()
        logger.log('AI >', 'green')
        logger.md(reply)
    } catch (err) {
        spinner.stop()
        logger.log('AI > 请求出错：' + err.message, 'red')
    }
}

// 退出：保存历史并结束进程（替代原 rl.on('close')）
function exitApp() {
    logger.log('\n感谢使用，再见！', 'gray')
    saveHistory(messages)
    process.exit(0)
}

// 处理用户提交的一行输入：命令 / 普通对话(可能带 @ 上下文)
async function handleSubmit(line, box) {
    const input = line.trim()
    if (!input) return
    // 命令：不参与 @ 上下文
    if (input.startsWith('/')) {
        runCommand(input, {
            messages,
            exit: exitApp,
            clearScreen: () => box.clearScreen(),
        })
        return
    }
    // 解析 @ 附加的文件作为上下文
    const { contextText, userQuestion, failed, files } = buildContext(line)
    failed.forEach((f) => logger.log(`⚠ 无法读取文件：${f}`, 'red'))
    // 若有 @ 选定文件，则按文件路径匹配 .front-claude/rules 规则；
    // 命中规则的 content 合并进同一条 user 消息：紧跟「参考资料」之后、用户问题之前，故会写入对话历史
    const matchedRules = getMatchedRules(files, ruleMap)
    let ruleSection = ''
    if (matchedRules.length) {
        const names = matchedRules.map((r) => path.basename(r.key)).join(', ')
        logger.log(`✓ 已附带开发规范：${names}`, 'gray')
        ruleSection = '【匹配到的规则】：\n' + matchedRules.map((r) => r.content).join('\n\n') + '\n\n'
    }
    await chat(contextText + ruleSection + userQuestion)
}

// 启动主流程：配置模型 → 显示欢迎 → 进入自定义输入界面
async function main() {
    // 首次使用时会引导输入「接口地址 / API Key / 模型名称」，配置写入当前目录的 .front-claude/settings.json；
    // 后续启动直接从该文件读取。注意：配置读取基于「当前终端目录」(process.cwd)。
    await ensureSettings()
    // 等待所有 MCP 服务连接完成，确保 tools 列表已就绪后再进入交互界面
    await toolsReady()

    const box = new InputBox()
    box.onSubmit = async (line) => {
        // chat 期间忽略用户按键，避免与渲染/动画冲突；回复打印完再恢复
        box.pause()
        try {
            await handleSubmit(line, box)
        } finally {
            box.resume()
        }
    }
    box.onClose = exitApp

    showWelcome()
    box.start()
}

main()
