//项目文件扫描 + @ 上下文拼装
//- listProjectFiles: 递归收集当前工作目录下的文件相对路径（排除依赖/构建目录）
//- buildContext: 从用户提交文本里提取 @标记 的文件，读取内容并拼成参考资料
import fs from 'node:fs'
import path from 'node:path'

// 扫描时排除的目录名
const EXCLUDE_DIRS = new Set([
  'node_modules',
  '.git',
  '.front-claude',
  'dist',
  'build',
])

// @ 文件路径允许的字符（字母数字 _ - . /），用于提取与剥离标记
const AT_FILE_PATTERN = /@([\w./-]+)/g

/**
 * 递归收集当前工作目录下所有文件的相对路径
 * @param {string} [base] 起始目录，默认 process.cwd()
 * @returns {string[]} 相对路径数组（统一用正斜杠），按字典序排序
 */
export function listProjectFiles(base = process.cwd()) {
  const result = []
  const walk = (dir) => {
    let entries
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (EXCLUDE_DIRS.has(entry.name)) continue
        walk(path.join(dir, entry.name))
      } else if (entry.isFile()) {
        const rel = path.relative(base, path.join(dir, entry.name))
        result.push(rel.split(path.sep).join('/'))
      }
    }
  }
  walk(base)
  result.sort()
  return result
}

/**
 * 按关键词筛选文件（匹配相对路径，不区分大小写）
 * @param {string[]} files 文件相对路径数组
 * @param {string} keyword 筛选片段
 * @returns {string[]} 匹配的文件
 */
export function filterFiles(files, keyword = '') {
  const k = keyword.toLowerCase().trim()
  if (!k) return files
  return files.filter((f) => f.toLowerCase().includes(k))
}

/**
 * 从提交文本中提取 @标记 文件，读取内容并拼装参考资料
 * @param {string} text 用户提交的整行
 * @returns {{contextText:string, userQuestion:string, failed:string[], files:string[]}}
 *   contextText: 拼好的参考资料（无附件时为空串）
 *   userQuestion: 去掉 @标记 后的纯问题（为空时回退原文）
 *   failed: 读取失败的文件相对路径
 *   files: 去重后的 @ 选定文件相对路径（供后续规则匹配使用）
 */
export function buildContext(text) {
  const base = process.cwd()
  const marks = text.match(AT_FILE_PATTERN) || []
  const rels = [...new Set(marks.map((m) => m.slice(1)))]
  const blocks = []
  const failed = []
  for (const rel of rels) {
    try {
      const content = fs.readFileSync(path.resolve(base, rel), 'utf-8')
      blocks.push(`--- 文件：${rel} ---\n${content}\n--- 文件结束 ---`)
    } catch {
      failed.push(rel)
    }
  }
  const contextText = blocks.length
    ? '【参考资料：以下为用户通过 @ 附加的文件】\n' + blocks.join('\n\n') + '\n\n'
    : ''
  const cleaned = text.replace(AT_FILE_PATTERN, '').replace(/\s+/g, ' ').trim()
  const userQuestion = cleaned || text.trim()
  return { contextText, userQuestion, failed, files: rels }
}
