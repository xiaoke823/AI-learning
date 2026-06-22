//读取并组装系统提示词与用户上下文：基于 docs 下的模板填充运行时信息后返回
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { getUserHomeDir, getCurrentDir } from './pathUtils.js'

// 本模块位于 src/utils，docs 模板在 src/docs 下
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SYSTEM_DOC_PATH = path.resolve(__dirname, '../docs/systemDoc.md')
const USER_DOC_PATH = path.resolve(__dirname, '../docs/userContext.md')
const SKILL_TEMPLATE_PATH = path.resolve(__dirname, '../docs/skillTemplate.md')

/**
 * 安全读取文件：文件存在返回内容，不存在返回空字符串
 * @param {string} filePath 文件绝对路径
 * @returns {string} 文件内容或空字符串
 */
function readFileSafe(filePath) {
  if (!fs.existsSync(filePath)) return ''
  return fs.readFileSync(filePath, 'utf-8')
}

/**
 * 读取 systemDoc.md 模板，填充操作系统信息与当前工作目录后返回
 * @returns {string} 填充后的系统提示词
 */
export function readSystem() {
  let content = fs.readFileSync(SYSTEM_DOC_PATH, 'utf-8')
  // 填充操作系统信息：类型 + 版本 + 架构，便于大模型生成适配操作系统的指令
  const systemInfo = `${os.type()} ${os.release()} ${os.arch()}`
  content = content.replaceAll('${systemInfo}', systemInfo)
  // 填充用户当前工作目录(终端运行目录)，约束文件读写范围
  content = content.replaceAll('${workPath}', getCurrentDir())
  return content
}

/**
 * 读取 userContext.md 模板，填充用户主目录与项目工作目录下的 .front-claude/.front-md 文件地址及内容
 * 文件不存在时对应内容填空字符串
 * @returns {string} 填充后的用户上下文
 */
export function getUserContext() {
  let content = fs.readFileSync(USER_DOC_PATH, 'utf-8')
  // 用户主目录下的 .front-claude/.front-md
  const userMdPath = path.resolve(getUserHomeDir(), '.front-claude/front.md')
  // 项目工作目录下的 .front-claude/.front-md
  const projectMdPath = path.resolve(getCurrentDir(), '.front-claude/front.md')
  // 先读取内容，内容为空(文件不存在或为空内容)则对应路径也一并填空串
  const userContent = readFileSafe(userMdPath)
  const userPath = userContent ? userMdPath : ''
  const projectContent = readFileSafe(projectMdPath)
  const projectPath = projectContent ? projectMdPath : ''
  content = content.replaceAll('${userPath}', userPath)
  content = content.replaceAll('${userContent}', userContent)
  content = content.replaceAll('${projectPath}', projectPath)
  content = content.replaceAll('${projectContent}', projectContent)
  return content
}

/**
 * 从规则文件内容的 frontmatter 头部（以 --- 开始、以 --- 结束）提取 paths 匹配规则
 * 头部不存在或无 paths 键时返回空数组
 * 例如 paths 下的两条 glob 会解析为对应的字符串数组
 * @param {string} content 规则文件内容
 * @returns {string[]} paths 规则数组
 */
function parseRules(content) {
  // 匹配首部 --- ... --- 块，捕获中间内容（兼容 \r\n）
  const fmMatch = content.match(/^\s*---[ \t]*\r?\n([\s\S]*?)\r?\n---/)
  if (!fmMatch) return []
  const lines = fmMatch[1].split(/\r?\n/)
  const rules = []
  let inPaths = false
  for (const line of lines) {
    // 键值行：形如 paths: 或 description: —— 命中则按是否为 paths 切换收集态
    const keyMatch = line.match(/^(\s*)([A-Za-z0-9_-]+)\s*:/)
    if (keyMatch) {
      inPaths = keyMatch[2] === 'paths'
      continue
    }
    // 收集态下的列表项：- "**/*.css" 或 - xxx
    if (inPaths) {
      const itemMatch = line.match(/^\s*-\s+(.*)$/)
      if (itemMatch) {
        let val = itemMatch[1].trim()
        // 去除首尾引号（双引号或单引号包裹的值）
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1)
        }
        if (val) rules.push(val)
      }
    }
  }
  return rules
}

/**
 * 读取某个 rules 目录下的全部文件，组装为 { content, rules }
 * 目录不存在或不可读时返回空数组
 * @param {string} dir rules 目录绝对路径
 * @returns {{key:string, value:{content:string, rules:string[]}}[]}
 */
function readRulesDir(dir) {
  const result = []
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return result
  }
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const filePath = path.resolve(dir, entry.name)
    const content = fs.readFileSync(filePath, 'utf-8')
    result.push({ key: filePath, value: { content, rules: parseRules(content) } })
  }
  return result
}

/**
 * 加载用户主目录与当前项目目录下 .front-claude/rules 的全部规则文件
 * 返回 Map：键为文件绝对路径，值为 { content, rules }
 * 目录不存在时自动跳过
 * @returns {Map<string, {content:string, rules:string[]}>}
 */
export function readRules() {
  const rulesMap = new Map()
  const dirs = [
    path.resolve(getUserHomeDir(), '.front-claude/rules'),
    path.resolve(getCurrentDir(), '.front-claude/rules'),
  ]
  for (const dir of dirs) {
    for (const item of readRulesDir(dir)) {
      rulesMap.set(item.key, item.value)
    }
  }
  return rulesMap
}


/**
 * 从 SKILL.md 内容的 frontmatter 头部（以 --- 开始、以 --- 结束）提取中间内容
 * 头部不存在时返回空字符串
 * @param {string} content SKILL.md 文件内容
 * @returns {string} 头部中间内容（不含首尾的 ---）
 */
function parseSkillHeader(content) {
  // 匹配首部 --- ... --- 块，捕获中间内容（兼容 \r\n）
  const fmMatch = content.match(/^\s*---[ \t]*\r?\n([\s\S]*?)\r?\n---/)
  return fmMatch ? fmMatch[1] : ''
}

/**
 * 读取某个 skills 目录下每个子文件夹中的 SKILL.md，提取其 frontmatter 头部与文件地址
 * 目录不存在、子文件夹无 SKILL.md 或头部缺失时跳过
 * @param {string} dir skills 目录绝对路径
 * @returns {Map<string, {name:string, header:string, path:string}>} 键为 skill 的 name，值为 skill 名、头部内容与 SKILL.md 绝对路径
 */
function readSkillHeadersDir(dir) {
  const result = new Map()
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return result
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const skillPath = path.resolve(dir, entry.name, 'SKILL.md')
    if (!fs.existsSync(skillPath)) continue
    const content = fs.readFileSync(skillPath, 'utf-8')
    const header = parseSkillHeader(content)
    if (!header) continue
    // 头部首行通常为 name: xxx，以其作为 skill 标识；解析失败则退回用子文件夹名
    const nameMatch = header.split(/\r?\n/)[0].match(/^name\s*:\s*(.*)$/)
    const name = nameMatch ? nameMatch[1].trim() : entry.name
    result.set(name, { name, header, path: skillPath })
  }
  return result
}

/**
 * 加载用户主目录与当前项目目录下 .front-claude/skills 的全部 SKILL.md 头部，
 * 拼接（同名以项目目录为准）后填入 skillTemplate.md 的 ${skillcontent} 返回
 * 目录或文件不存在时自动跳过
 * @returns {string} 填充后的 skill 提示词
 */
export function getSkillHeaders() {
  // 先用户目录、后项目目录，项目目录后写入以实现项目级同名 skill 覆盖
  const dirs = [
    path.resolve(getUserHomeDir(), '.front-claude/skills'),
    path.resolve(getCurrentDir(), '.front-claude/skills'),
  ]
  const skillsMap = new Map()
  for (const dir of dirs) {
    for (const [name, info] of readSkillHeadersDir(dir)) {
      skillsMap.set(name, info)
    }
  }
  // 每个 skill 头部后附上其 SKILL.md 文件地址，块之间用空行分隔，便于大模型识别各 skill 边界
  const skillcontent = [...skillsMap.values()]
    .map((info) => `${info.header}\nskill名字[${info.name}]skill文件地址：${info.path}`)
    .join('\n\n')
  let content = fs.readFileSync(SKILL_TEMPLATE_PATH, 'utf-8')
  content = content.replaceAll('${skillcontent}', skillcontent)
  return content
}

// console.log(getSkillHeaders())
