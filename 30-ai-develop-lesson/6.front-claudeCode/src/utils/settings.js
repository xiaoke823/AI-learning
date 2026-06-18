//管理 .front-claude/settings.json：首次使用时的交互式配置引导，以及后续启动时的读取
//配置文件位于「当前终端目录」(process.cwd) 下的 .front-claude/settings.json，而非项目自带目录
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { getCurrentDir } from './pathUtils.js'

const SETTINGS_DIR = '.front-claude'
const SETTINGS_FILE = 'settings.json'

// 需要收集的三项配置：接口地址、API Key、模型名称
const FIELDS = [
  {
    key: 'baseURL',
    label: '接口地址 (Base URL)',
    hint: 'OpenAI 官方: https://api.openai.com/v1；其它厂商填兼容地址',
  },
  {
    key: 'apiKey',
    label: 'API Key',
    hint: '形如 sk-xxxxxxxx',
  },
  {
    key: 'model',
    label: '模型名称',
    hint: '如 gpt-4o-mini / deepseek-chat / glm-4-flash',
  },
]

/**
 * 获取 settings.json 的绝对路径（位于当前终端目录的 .front-claude 下）
 * @returns {string} settings.json 绝对路径
 */
export function getSettingsPath() {
  return path.resolve(getCurrentDir(), SETTINGS_DIR, SETTINGS_FILE)
}

/**
 * 读取已存在的配置；文件不存在或内容不完整时返回 null
 * @returns {{model:string,apiKey:string,baseURL:string}|null}
 */
export function readSettings() {
  const file = getSettingsPath()
  if (!fs.existsSync(file)) return null
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'))
    // 三项配置齐全才视为有效
    if (data && data.model && data.apiKey && data.baseURL) return data
    return null
  } catch {
    // 文件为空或不是合法 JSON，视为未配置
    return null
  }
}

/**
 * 将配置写入 .front-claude/settings.json（目录不存在则自动创建）
 * @param {{model:string,apiKey:string,baseURL:string}} settings 配置对象
 */
export function writeSettings(settings) {
  const file = getSettingsPath()
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, JSON.stringify(settings, null, 2), 'utf-8')
}

// 对 API Key 做简单脱敏，避免在终端回显时完整泄露
function maskApiKey(key) {
  if (!key) return ''
  if (key.length <= 8) return '****'
  return `${key.slice(0, 4)}****${key.slice(-4)}`
}

/**
 * 首次使用时的交互式配置引导：依次让用户输入三项配置并保存
 * 使用独立的 readline 实例，引导结束后即关闭，避免与主对话界面冲突
 * @returns {Promise<{model:string,apiKey:string,baseURL:string}>} 最终写入的配置
 */
export function runSetup() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })
    const settings = {}
    let i = 0

    const ask = () => {
      // 全部收集完毕：写入并结束
      if (i >= FIELDS.length) {
        rl.close()
        writeSettings(settings)
        console.log('\n配置已保存到：', getSettingsPath())
        console.log(`  Base URL : ${settings.baseURL}`)
        console.log(`  API Key  : ${maskApiKey(settings.apiKey)}`)
        console.log(`  模型名称 : ${settings.model}\n`)
        resolve(settings)
        return
      }
      const f = FIELDS[i]
      rl.question(`请输入${f.label}（${f.hint}）：`, (answer) => {
        const val = answer.trim()
        if (!val) {
          // 非空校验：重新询问当前项
          console.log('该项不能为空，请重新输入。')
          ask()
          return
        }
        settings[f.key] = val
        i++
        ask()
      })
    }

    console.log('\n检测到首次使用，请先完成模型配置（共 3 项）：')
    ask()
  })
}

/**
 * 获取配置：已存在则直接读取，否则进入首次配置引导
 * @returns {Promise<{model:string,apiKey:string,baseURL:string}>}
 */
export async function ensureSettings() {
  const existing = readSettings()
  if (existing) return existing
  return runSetup()
}
