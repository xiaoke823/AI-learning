import logger from "./logger.js"
export default function showWelcome() {
    logger.log('─────────────────────────────────────────────', 'dim')
    logger.log('   🤖  AI 终端助手', ['bold', 'cyan'])
    logger.log('   类似 claude code 的终端 AI 助手', 'gray')
    logger.log('─────────────────────────────────────────────', 'dim')
    logger.log('')
    logger.log('  ▸ 输入消息即可与 AI 对话', 'green')
    logger.log('  ▸ 输入 /help 查看命令，/exit 退出程序', 'yellow')
    logger.log('')
}