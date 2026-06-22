//规则匹配：根据用户 @ 选定的文件，从规则 Map 中找出命中的规则，合并其 content 返回
import { globToRegex } from './glob.js'

/**
 * 根据 @ 选定的文件匹配规则 Map，返回命中的规则条目（保留 Map 迭代顺序，按 content 去重）
 * 任一 @ 文件命中某规则的任一 paths 模式，即视为该规则命中
 * @param {string[]} files @ 选定文件的相对路径数组
 * @param {Map<string, {content:string, rules:string[]}>} rulesMap readRules() 返回的规则 Map
 * @returns {{key:string, content:string}[]} 命中的规则条目数组；无命中为空数组
 */
export function getMatchedRules(files, rulesMap) {
  if (!files || !files.length || !rulesMap || !rulesMap.size) return []
  // 文件路径统一用 /，与规则 glob 分隔符一致
  const normalizedFiles = files.map((f) => String(f).replace(/\\/g, '/'))
  const result = []
  const seen = new Set()
  for (const [key, rule] of rulesMap) {
    const { content, rules } = rule
    if (!rules || !rules.length) continue
    // 预编译该规则的 glob，避免对每个文件重复编译
    const regexes = rules.map((g) => globToRegex(g))
    const hit = normalizedFiles.some((file) => regexes.some((re) => re.test(file)))
    if (hit && !seen.has(content)) {
      seen.add(content)
      result.push({ key, content })
    }
  }
  return result
}

/**
 * 命中规则的 content 合并字符串（空行分隔），无命中返回空串
 * @param {string[]} files @ 选定文件的相对路径数组
 * @param {Map<string, {content:string, rules:string[]}>} rulesMap 规则 Map
 * @returns {string} 合并后的规则内容；无命中返回空串
 */
export function matchRulesContent(files, rulesMap) {
  return getMatchedRules(files, rulesMap)
    .map((r) => r.content)
    .join('\n\n')
}
