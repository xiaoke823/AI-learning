//整个项目的启动入口
import './utils/env.js' // 加载项目自带的 .env 环境变量（与运行时目录无关）
import readline from 'node:readline'
import ora from 'ora'
import { chatWithModel } from './utils/model.js'
import { ensureSettings } from './utils/settings.js' // 首次使用引导 / 读取模型配置
import logger from './utils/logger.js' // 带颜色的终端输出
import showWelcome from './utils/init.js'
import { saveHistory } from './utils/memory.js'


// 对话历史，后续接入大模型时作为上下文传入接口
const messages = []

// 处理以 / 开头的内置命令，返回 true 表示已处理
function handleCommand(input, rl) {
  const [cmd] = input.trim().split(/\s+/)
  switch (cmd) {
    case '/exit':
    case '/quit':
      logger.log('再见！', 'gray')
      rl.close()
      return true
    case '/help':
      logger.log('可用命令：', 'cyan')
      logger.log('  /help    显示帮助信息', 'white')
      logger.log('  /clear   清空当前对话历史', 'white')
      logger.log('  /exit    退出程序', 'white')
      return true
    case '/clear':
      messages.length = 0
      logger.log('已清空对话历史。', 'green')
      return true
    default:
      logger.log(`未知命令: ${cmd}，输入 /help 查看可用命令`, 'red')
      return true
  }
}

// 处理一次对话：把用户问题发给大模型，打印回复并记录到对话历史
async function chat(userInput) {
  // 记录用户消息
  messages.push({ role: 'user', content: userInput })
  // 加载动画：discardStdin: false 避免吞掉 readline 的输入
  const spinner = ora({ text: 'AI 正在思考...', discardStdin: false }).start()
  try {
    // 请求大模型
    const reply = await chatWithModel(messages)
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

// 启动主流程：确保已配置模型后，再创建交互界面并开始对话
async function main() {
  // 首次使用时会引导输入「接口地址 / API Key / 模型名称」，配置写入当前目录的 .front-claude/settings.json；
  // 后续启动直接从该文件读取，无需重复输入。
  // 注意：配置读取基于「当前终端目录」(process.cwd)，所以在哪个目录启动就读哪个目录的配置。
  await ensureSettings()

  // 配置引导使用的临时 readline 已关闭，这里再创建主对话界面，避免与引导过程冲突
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '你 > ',
  })

  // 监听用户每一行输入
  rl.on('line', async (line) => {
    const input = line.trim()

    // 空输入直接回到提示符
    if (!input) {
      rl.prompt()
      return
    }

    // 命令
    if (input.startsWith('/')) {
      handleCommand(input, rl)
      rl.prompt()
      return
    }

    // 普通对话
    await chat(input)
    rl.prompt()
  })

  // 用户按 Ctrl+C 或调用 rl.close() 时触发
  rl.on('close', () => {
    logger.log('\n感谢使用，再见！', 'gray')
    saveHistory(messages)
    process.exit(0)
  })

  showWelcome()
  rl.prompt()
}

main()
