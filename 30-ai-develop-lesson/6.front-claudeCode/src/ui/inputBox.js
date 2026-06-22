//核心输入控件：接管按键(raw 模式 + emitKeypressEvents)，自维护输入缓冲与渲染，
//并用状态机(normal/slash/at)管理"普通输入/指令菜单/文件菜单"三种态。
//append-only 输入（不在行内移动光标），光标恒等于 buffer 末尾，从而简化渲染。
import readline from 'node:readline'
import chalk from 'chalk'
import { Menu } from './menu.js'
import { filterCommands } from '../commands/index.js'
import { listProjectFiles, filterFiles } from '../files/index.js'

const PROMPT_TEXT = '你 > '
const PROMPT = chalk.green(PROMPT_TEXT)

// 可见字符判断（排除控制字符）
function isPrintable(ch) {
  if (!ch) return false
  const code = ch.codePointAt(0)
  return code >= 0x20 && code !== 0x7f
}

// 计算字符串在终端的显示宽度（CJK 等宽字符占 2 列），用于光标定位
function visualWidth(str) {
  let w = 0
  for (const ch of str) {
    const code = ch.codePointAt(0)
    w +=
      code >= 0x1100 &&
      (code <= 0x115f ||
        (code >= 0x2e80 && code <= 0xa4cf) ||
        (code >= 0xac00 && code <= 0xd7a3) ||
        (code >= 0xf900 && code <= 0xfaff) ||
        (code >= 0xfe30 && code <= 0xfe4f) ||
        (code >= 0xff00 && code <= 0xff60) ||
        (code >= 0xffe0 && code <= 0xffe6))
        ? 2
        : 1
  }
  return w
}

export class InputBox {
  constructor() {
    this.buffer = ''
    this.mode = 'normal' // normal | slash | at
    this.menu = null
    this.menuTriggerIndex = -1 // 触发符(/ 或 @)在 buffer 中的索引
    this.files = null // 文件列表缓存（首次 @ 时扫描）
    this.attachedFiles = [] // @ 选中的文件相对路径
    this.lastRows = 0 // 上次渲染占用的行数（输入行 + 菜单行）
    this.paused = false // true 时忽略普通按键（chat 期间）
    this.onSubmit = null
    this.onClose = null
  }

  start() {
    readline.emitKeypressEvents(process.stdin)
    if (process.stdin.isTTY) process.stdin.setRawMode(true)
    process.stdin.on('keypress', (str, key) => this.handleKey(str, key))
    this.paint()
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
    // AI 回复已打印多行，从新的一行重新画提示符，不依赖旧的 lastRows
    process.stdout.write('\n')
    this.lastRows = 0
    this.paint()
  }

  // 清空屏幕显示并重置渲染状态（供 /clear 使用；不清空对话历史 messages）
  clearScreen() {
    process.stdout.write('\x1b[2J\x1b[3J\x1b[H') // 清屏 + 清滚动缓冲 + 光标回左上
    this.lastRows = 0
  }

  handleKey(str, key) {
    // Ctrl+C 始终可退出
    if (key && key.ctrl && key.name === 'c') {
      this.onClose && this.onClose()
      return
    }
    if (this.paused) return
    // 仅当返回 'repaint' 才全量重绘；'none' 表示已原地更新或无变化，避免打字闪烁
    const action =
      this.mode === 'normal' ? this.handleNormal(str, key) : this.handleMenu(str, key)
    if (action === 'repaint') this.paint()
  }

  // ---- normal 态 ----
  // 返回 'repaint'(需全量重绘) 或 'none'(已原地更新/无变化，避免打字闪烁)
  handleNormal(str, key) {
    if (key.name === 'return') {
      const submitted = this.submit()
      return submitted ? 'none' : 'repaint' // 有提交交由 resume，空输入则重绘空提示符
    }
    if (key.name === 'backspace') {
      // 原地删除末尾字符（按显示宽度回退，兼容中文占2列），避免整行重绘闪烁
      if (this.buffer.length) {
        const lastCh = this.buffer[this.buffer.length - 1]
        this.buffer = this.buffer.slice(0, -1)
        const w = visualWidth(lastCh)
        process.stdout.write('\b'.repeat(w) + ' '.repeat(w) + '\b'.repeat(w))
      }
      return 'none'
    }
    if (isPrintable(str) && !key.ctrl && !key.meta) {
      this.buffer += str
      const justTyped = this.buffer[this.buffer.length - 1]
      if (justTyped === '/' && this.isCommandStart()) {
        this.openSlash()
        return 'repaint'
      }
      if (justTyped === '@') {
        this.openAt()
        return 'repaint'
      }
      // 普通字符：原地追加显示，整行从不清空，消除打字闪烁
      process.stdout.write(str)
      return 'none'
    }
    return 'none' // 方向键等：append-only 下无操作，不重绘
  }

  // / 处于"命令起始位置"：行首或前一字符为空格
  isCommandStart() {
    const len = this.buffer.length
    if (len < 1) return false
    if (len === 1) return true // 行首
    return this.buffer[len - 2] === ' '
  }

  // ---- 菜单态 ----
  // 菜单态的任何变化都需重绘列表，统一返回 'repaint'（paint 内会隐藏光标减轻闪烁）
  handleMenu(str, key) {
    if (key.name === 'up') {
      this.menu.moveUp()
      return 'repaint'
    }
    if (key.name === 'down') {
      this.menu.moveDown()
      return 'repaint'
    }
    if (key.name === 'tab' || key.name === 'return') {
      this.confirmSelect()
      return 'repaint'
    }
    if (key.name === 'escape') {
      this.closeMenu()
      return 'repaint'
    }
    if (key.name === 'backspace') {
      if (this.buffer.length) this.buffer = this.buffer.slice(0, -1)
      if (this.buffer.length <= this.menuTriggerIndex) this.closeMenu()
      else this.refreshFilter()
      return 'repaint'
    }
    // slash 菜单下输入空格 → 关闭菜单（命令输入完成）
    if (this.mode === 'slash' && str === ' ') {
      this.buffer += str
      this.closeMenu()
      return 'repaint'
    }
    if (isPrintable(str) && !key.ctrl && !key.meta) {
      this.buffer += str
      this.refreshFilter()
    }
    return 'repaint'
  }

  // 当前菜单的筛选片段：触发符之后到末尾
  currentQuery() {
    return this.buffer.slice(this.menuTriggerIndex + 1)
  }

  refreshFilter() {
    const q = this.currentQuery()
    if (this.mode === 'slash') this.menu.setVisible(filterCommands(q))
    else this.menu.setVisible(filterFiles(this.files, q))
  }

  confirmSelect() {
    const sel = this.menu.selected()
    if (!sel) {
      this.closeMenu()
      return
    }
    let replacement
    if (this.mode === 'slash') {
      replacement = sel.name // 如 "/help"
    } else {
      replacement = '@' + sel // 如 "@app.js"
      this.attachedFiles.push(sel)
    }
    // 用完整值替换"触发符 + 草稿筛选片段"
    this.buffer = this.buffer.slice(0, this.menuTriggerIndex) + replacement
    this.closeMenu()
  }

  // ---- 菜单开关 ----
  openSlash() {
    this.menuTriggerIndex = this.buffer.length - 1
    this.mode = 'slash'
    this.menu = new Menu({
      maxRows: 6,
      renderItem: (c, sel) => {
        // 先 padEnd 再着色，避免颜色码被计入对齐宽度导致列错位
        const name = c.name.padEnd(8)
        return sel ? chalk.cyan('▶ ' + name + c.desc) : '  ' + name + chalk.gray(c.desc)
      },
    })
    this.menu.setVisible(filterCommands(''))
  }

  openAt() {
    if (!this.files) this.files = listProjectFiles()
    this.menuTriggerIndex = this.buffer.length - 1
    this.mode = 'at'
    this.menu = new Menu({
      maxRows: 8,
      renderItem: (f, sel) => (sel ? chalk.cyan('▶ ' + f) : '  ' + f),
    })
    this.menu.setVisible(filterFiles(this.files, ''))
  }

  closeMenu() {
    this.mode = 'normal'
    this.menu = null
    this.menuTriggerIndex = -1
  }

  // ---- 提交 ----
  submit() {
    const line = this.buffer
    this.buffer = ''
    this.attachedFiles = []
    if (line.trim()) {
      // 先换行：把用户输入保留在本行，避免被随后的 spinner/AI 回复覆盖而"消失"
      process.stdout.write('\n')
      this.onSubmit && this.onSubmit(line)
      return true
    }
    return false
  }

  // ---- 渲染 ----
  // 清除上次渲染的行。约定：paint() 结束时光标恒位于"输入行(首行)"，
  // 因此从这里向下逐行清除，最后回到首行，供本次重绘使用。
  eraseOld() {
    const rows = this.lastRows
    if (rows <= 0) return
    for (let i = 0; i < rows; i++) {
      process.stdout.write('\r\x1b[2K') // 清当前行
      if (i < rows - 1) process.stdout.write('\x1b[1B') // 下移一行
    }
    if (rows > 1) process.stdout.write(`\x1b[${rows - 1}A`) // 回到首行
  }

  paint() {
    // 重绘期间隐藏光标，避免光标在清行与输入位置间跳动造成的闪烁
    process.stdout.write('\x1b[?25l')
    this.eraseOld()
    const menuRows =
      this.mode !== 'normal' && this.menu ? this.menu.renderLines() : []
    // 输入行
    process.stdout.write('\r\x1b[2K')
    process.stdout.write(PROMPT + this.buffer)
    // 菜单行
    for (const line of menuRows) {
      process.stdout.write('\r\n\x1b[2K')
      process.stdout.write(line)
    }
    // 光标定位回输入行末尾（append-only，光标恒在末尾）
    if (menuRows.length > 0) {
      process.stdout.write(`\x1b[${menuRows.length}A`) // 上移回输入行
      process.stdout.write('\r')
      const col = visualWidth(PROMPT_TEXT) + visualWidth(this.buffer)
      if (col > 0) process.stdout.write(`\x1b[${col}C`)
    }
    this.lastRows = 1 + menuRows.length
    process.stdout.write('\x1b[?25h') // 恢复光标
  }
}
