//简单 glob 匹配：把规则里的 paths 模式（如 **/*.css）转为正则后做匹配
//支持：** 跨目录、* 单层（不含分隔符）、? 单字符；路径分隔符统一用 /
//规则较简单，按本项目 rules 的用法（文件类型级 glob）设计，不追求完整 minimatch 语义

/**
 * 将 glob 模式转为锚定首尾的正则
 * 星号星号加斜杠 表示零个或多个目录段（含零个）；星号星号 表示任意字符含分隔符；
 * 单星号 表示单层；问号 表示单个非分隔符字符
 * @param {string} glob glob 模式
 * @returns {RegExp} 锚定首尾的正则
 */
export function globToRegex(glob) {
  const pattern = String(glob).trim()
  let re = '^'
  let i = 0
  while (i < pattern.length) {
    const c = pattern[i]
    if (c === '*') {
      // ** 跨目录
      if (pattern[i + 1] === '*') {
        i += 2
        if (pattern[i] === '/') {
          // **/ → 零个或多个目录段（含零个），形如 a.css / dir/a.css / a/b/c.css 均可命中
          re += '(?:.*/)?'
          i++
        } else {
          // ** → 任意字符（含分隔符）
          re += '.*'
        }
      } else {
        // * → 单层任意字符（不含分隔符）
        re += '[^/]*'
        i++
      }
    } else if (c === '?') {
      // ? → 单个非分隔符字符
      re += '[^/]'
      i++
    } else if ('\\^$.+()[]{}|'.includes(c)) {
      // 转义正则元字符
      re += '\\' + c
      i++
    } else {
      re += c
      i++
    }
  }
  return new RegExp(re + '$')
}

/**
 * 判断单个文件路径是否匹配某个 glob 模式
 * 文件路径中的反斜杠会先统一成正斜杠再匹配
 * @param {string} filePath 文件相对路径
 * @param {string} glob glob 模式
 * @returns {boolean} 是否匹配
 */
export function matchGlob(filePath, glob) {
  const normalized = String(filePath).replace(/\\/g, '/')
  return globToRegex(glob).test(normalized)
}
