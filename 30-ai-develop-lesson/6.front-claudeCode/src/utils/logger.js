import chalk from 'chalk'
import { marked } from 'marked'
import { markedTerminal } from 'marked-terminal'

// 配置 marked 使用终端渲染器，让大模型返回的 markdown 能以彩色格式化输出
marked.use(markedTerminal())

export default {
    // color 可传单个修饰符/颜色（如 'red'），也可传数组按顺序链式应用（如 ['bold', 'cyan']）
    log(text, color) {
        let fn = chalk
        const styles = Array.isArray(color) ? color : [color]
        for (const c of styles) {
            if (typeof fn[c] !== 'function') {
                console.log(text)
                return
            }
            fn = fn[c]
        }
        console.log(fn(text))
    },
    // 解析 markdown 并以彩色格式化输出，用于展示大模型返回的 md 结果
    md(text) {
        console.log(marked.parse(text))
    }
}
