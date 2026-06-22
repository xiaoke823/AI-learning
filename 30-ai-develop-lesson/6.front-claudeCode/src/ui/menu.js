//通用列表浮层菜单：维护选中索引、上下移动、滚动窗口、高亮渲染
//被 src/ui/inputBox.js 的 / 菜单与 @ 菜单复用
//注意：Menu 不负责"筛选"，筛选由 inputBox 调用 setVisible(筛选结果) 注入
import chalk from 'chalk'

export class Menu {
  /**
   * @param {object} opts
   * @param {number} [opts.maxRows=6] 最多渲染行数，超出靠选中项滚动
   * @param {function} [opts.renderItem] (item, isSelected) => 行字符串
   */
  constructor({ maxRows = 6, renderItem } = {}) {
    this.visible = []
    this.selectedIndex = 0
    this.maxRows = maxRows
    this.renderItem =
      renderItem || ((item, sel) => (sel ? chalk.cyan('▶ ' + item) : '  ' + item))
    this._top = 0 // 当前滚动窗口起始索引
  }

  /** 设置当前可见（筛选后的）项，并校正选中索引 */
  setVisible(items) {
    this.visible = items
    if (this.selectedIndex >= this.visible.length) this.selectedIndex = 0
    this._top = 0
  }

  /** 当前选中项 */
  selected() {
    return this.visible[this.selectedIndex]
  }

  moveDown() {
    if (!this.visible.length) return
    this.selectedIndex = (this.selectedIndex + 1) % this.visible.length
  }

  moveUp() {
    if (!this.visible.length) return
    this.selectedIndex =
      (this.selectedIndex - 1 + this.visible.length) % this.visible.length
  }

  /** 计算滚动窗口起始索引，保证选中项可见 */
  _scrollTop() {
    if (this.selectedIndex < this._top) this._top = this.selectedIndex
    else if (this.selectedIndex >= this._top + this.maxRows)
      this._top = this.selectedIndex - this.maxRows + 1
    return this._top
  }

  /** 返回需要渲染的行字符串数组 */
  renderLines() {
    if (!this.visible.length) return [chalk.gray('  （无匹配项）')]
    const start = this._scrollTop()
    const end = Math.min(start + this.maxRows, this.visible.length)
    const lines = []
    for (let i = start; i < end; i++) {
      lines.push(this.renderItem(this.visible[i], i === this.selectedIndex))
    }
    return lines
  }
}
