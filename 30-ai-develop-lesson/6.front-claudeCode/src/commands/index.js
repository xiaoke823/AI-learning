//内置指令定义：/ 菜单与命令执行共用同一份数据
//由 src/ui/inputBox.js 的 / 菜单读取展示与筛选，由 src/app.js 的命令执行调用
import logger from '../utils/logger.js'

// 内置指令列表：name 含 /，desc 用于菜单展示与 /help
export const COMMANDS = [
  { name: '/help', desc: '显示帮助信息' },
  { name: '/clear', desc: '清空屏幕显示(保留历史)' },
  { name: '/exit', desc: '退出程序' },
  { name: '/quit', desc: '退出程序' },
]

/**
 * 按关键词筛选指令（不区分大小写，匹配 name 或 desc）
 * @param {string} keyword 用户在 / 之后输入的筛选片段
 * @returns {Array<{name:string,desc:string}>} 匹配的指令
 */
export function filterCommands(keyword = '') {
  const k = keyword.toLowerCase().trim()
  if (!k) return COMMANDS
  return COMMANDS.filter(
    (c) => c.name.toLowerCase().includes(k) || c.desc.toLowerCase().includes(k)
  )
}

/**
 * 解析并执行一条以 / 开头的指令
 * @param {string} input 用户提交的整行
 * @param {{messages:Array, exit:Function}} ctx 执行上下文
 * @returns {boolean} 是否为已知指令
 */
export function runCommand(input, ctx) {
  const [cmd] = input.trim().split(/\s+/)
  switch (cmd) {
    case '/help':
      logger.log('可用命令：', 'cyan')
      COMMANDS.forEach((c) => logger.log(`  ${c.name.padEnd(8)} ${c.desc}`, 'white'))
      return true
    case '/clear':
      // 仅清空屏幕上的对话显示，保留对话历史(messages)作为大模型上下文
      ctx.clearScreen()
      logger.log('已清空屏幕显示（对话历史上下文保留）。', 'gray')
      return true
    case '/exit':
    case '/quit':
      logger.log('再见！', 'gray')
      ctx.exit()
      return true
    default:
      logger.log(`未知命令: ${cmd}，输入 /help 查看可用命令`, 'red')
      return false
  }
}
