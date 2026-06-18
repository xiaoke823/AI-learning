//历史记录相关：将传入数据作为 json 写入 .front-claude/history 下按项目隔离的目录
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 本模块位于 src/utils，项目根目录在向上两级
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../../')

/**
 * 将传入的数据作为 json 文件写入历史记录目录
 * 目录结构：<项目根目录>/.front-claude/history/<当前项目名>/<时间戳>.json
 * 若目录不存在会自动递归创建。当前项目名取自运行终端所在目录(cwd)的最后一级。
 * @param {any} data 需要保存的数据，会被 JSON.stringify 序列化
 * @returns {string} 写入的 json 文件绝对路径
 */
export function saveHistory(data) {
    // 历史记录根目录：项目目录下的 .front-claude/history
    const historyDir = path.resolve(projectRoot, '.front-claude', 'history')

    // 根据当前终端所在项目地址，取项目同名作为子目录，隔离不同项目的历史
    const currentDir = process.cwd()
    const projectName = path.basename(currentDir)
    const targetDir = path.resolve(historyDir, projectName)

    // 目录不存在则递归创建（不存在 .front-claude 时一并创建）
    if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
    }

    // 以时间戳命名 json 文件，避免覆盖已有历史记录
    const fileName = `${Date.now()}.json`
    const filePath = path.resolve(targetDir, fileName)

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
    return filePath
}
