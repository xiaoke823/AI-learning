# 技术文档 · `/` 指令选择 与 `@` 文件选择

> 本文档描述最终代码的实现方式，与 `src/` 代码保持一致。

## 一、核心难点分析

现有 `src/app.js` 原本使用 node 内置 readline 的**行式（cooked）模式**：
- `rl.on('line', ...)` 只在用户**按回车后**才拿到整行输入；
- 每个字符由 readline 接管显示，无法在"按下单个键"的瞬间介入。

而本次需求是**按键级**响应（按 `/`、`@` 立即弹列表、输入实时筛选、上下/Tab 选择），行式 readline 无法满足。因此改为"**自己接管按键输入**"。

## 二、总体方案

自己实现一个轻量**输入控件（InputBox）**接管按键：

1. 进入 raw 模式：`process.stdin.setRawMode(true)`，让每个按键立刻可达；
2. 用 `readline.emitKeypressEvents(process.stdin)` 把原始按键转为结构化的 `keypress` 事件；
3. 自己维护输入缓冲与渲染；
4. 用**状态机**管理三种态：`normal`（普通输入）/ `slash`（指令菜单）/ `at`（文件菜单）；
5. 回车时，把当前整行回调给 `app.js`，由它决定走命令还是对话。

输入采用 **append-only**（不在行内移动光标），光标恒位于输入末尾，从而简化渲染与光标定位。**不引入新依赖**。

## 三、用到的库

| 库 | 来源 | 用途 |
| --- | --- | --- |
| `node:readline` | 内置 | `emitKeypressEvents`，按键事件 |
| `node:fs` | 内置 | 扫描目录、读取文件内容 |
| `node:path` | 内置 | 路径拼接、相对路径计算 |
| `chalk` | 已安装 | 列表选中高亮、提示着色 |

**无需新增任何第三方依赖**。

## 四、模块划分

### 新增文件
| 文件 | 职责 |
| --- | --- |
| `src/ui/inputBox.js` | 核心输入控件：接管按键 + 状态机 + 输入行/列表渲染 + 抗闪烁 |
| `src/ui/menu.js` | 通用列表浮层：选中索引、上下移动、滚动窗口、高亮渲染，`/` 与 `@` 复用 |
| `src/commands/index.js` | 指令定义数组 + 筛选函数 + 执行函数；`/` 菜单与命令执行共用 |
| `src/files/index.js` | 递归扫描项目文件（排除目录）+ 按 `@` 标记读取并拼装上下文 |

### 改动文件
- `src/app.js`：用 `InputBox` 替换 `readline` 的 line 逻辑；命令走 `src/commands`；发送对话前用 `src/files` 解析 `@` 上下文。

### 不动文件
`request/`、`utils/*`（settings、model、memory、logger、env、pathUtils、init）完全保持不变。

## 五、各模块逻辑

### 5.1 `src/commands/index.js`
- 导出 `COMMANDS`：`[{ name:'/help', desc:'显示帮助信息' }, ...]`，集中一份指令表（`/clear` 的 desc 为"清空屏幕显示(保留历史)"）；
- 导出 `filterCommands(keyword)`：按 keyword 对 `name`/`desc` 做包含匹配（不区分大小写）；
- 导出 `runCommand(input, ctx)`：解析并执行 `/` 指令；`ctx = { messages, exit, clearScreen }`。其中 `/clear` 调用 `ctx.clearScreen()` **清屏但不清 `messages`**。

### 5.2 `src/files/index.js`
- `listProjectFiles()`：从 `process.cwd()` 递归收集文件**相对路径**，跳过 `node_modules`、`.git`、`.front-claude`、`dist`、`build`；
- `filterFiles(files, keyword)`：对相对路径做包含匹配；
- `buildContext(text)`：用正则 `/@([\w./-]+)/g` 提取所有 `@相对路径` 标记，读取对应文件内容，按需求文档 3.6 格式拼装"参考资料"；读取失败收集到 `failed`。返回 `{ contextText, userQuestion, failed }`，其中 `userQuestion` 为去掉 `@` 标记后的纯问题（为空时回退原文）。

### 5.3 `src/ui/menu.js`
封装一个 `Menu`：
- 持有 `visible`（当前筛选结果）、`selectedIndex`、`maxRows`、`renderItem`；
- `setVisible(items)` → 设置可见项并校正选中索引；
- `moveUp()` / `moveDown()` → 在 `visible` 内**环形**移动；
- `renderLines()` → 返回需渲染的行字符串数组，选中项高亮，超出 `maxRows` 的靠选中项滚动；空匹配返回"（无匹配项）"；
- `selected()` → 返回当前选中项。
- **Menu 不负责筛选**，筛选由 inputBox 调用 `setVisible(筛选结果)` 注入，从而让 `/`、`@` 复用同一渲染器。

### 5.4 `src/ui/inputBox.js`（核心）
**状态**：`mode`（normal/slash/at）、`buffer`（append-only）、`menu`、`menuTriggerIndex`（触发符位置）、`files`（文件列表缓存）、`attachedFiles`、`lastRows`（上次渲染行数）、`paused`（chat 期间忽略按键）。

**抗闪烁渲染策略**（关键）：
- **普通打字 / 退格**：原地增量更新，**不触发整行重绘**——输入字符直接 `process.stdout.write(str)` 追加、退格用 `\b` 按显示宽度回退（兼容中文占 2 列），整行从不清空；
- **菜单出现 / 上下选择 / 筛选**：必须全量重绘 `paint()`，重绘期间**隐藏光标**（`\x1b[?25l` … `\x1b[?25h`），避免光标在清行位置与输入位置间跳动造成闪烁；
- `handleKey` 依据处理函数返回值 `'repaint'` / `'none'` 决定是否重绘，`'none'` 表示已原地更新或无变化。

**按键处理（keypress）**：
- `Ctrl+C` → 始终触发 `onClose`；
- `normal` 态
  - `Enter` → `submit()`：先 `write('\n')` 换行**保留用户输入行**，再回调 `onSubmit(line)`；
  - 检测到 `/` 且处于"命令起始位置" → `openSlash`；
  - 检测到 `@` → `openAt`；
  - 普通字符 → 原地 `write`；`Backspace` → 原地退格；方向键 → 无操作。
- `slash` / `at` 态（菜单态）
  - `↑`/`↓` → `menu.moveUp/Down`；
  - 普通字符 → 追加到 `buffer` 筛选片段 + `refreshFilter`；
  - `Tab`/`Enter` → `confirmSelect`：`slash` 用选中指令名替换"触发符 + 草稿"；`at` 插入 `@相对路径` 并记录 `attachedFiles`；随后 `closeMenu`；
  - `空格`（仅 `slash`）→ `closeMenu`；
  - `Esc` → `closeMenu`；
  - `Backspace` 删到触发符（`buffer.length <= menuTriggerIndex`）→ `closeMenu`。

**`clearScreen()`**：输出 `\x1b[2J\x1b[3J\x1b[H`（清屏 + 清滚动缓冲 + 光标回左上）并置 `lastRows=0`，供 `/clear` 调用。

**`paint()`**：隐藏光标 → `eraseOld()`（光标约定在首行，向下逐行清除 `lastRows` 行后回到首行）→ 画输入行 + 菜单行 → 光标定位回输入行末尾 → 恢复光标。

**`pause()` / `resume()`**：`pause` 在 chat 期间忽略按键；`resume` 在 AI 回复打印完后换行重画提示符。

### 5.5 `src/app.js`
- 移除 `readline.createInterface` 与 `rl.on('line')`、内联 `handleCommand`；
- 引入 `InputBox`、`runCommand`、`buildContext`；
- `box.onSubmit = async (line) => { box.pause(); await handleSubmit(line, box); box.resume() }`：
  - `line` 以 `/` 开头 → `runCommand(line, { messages, exit: exitApp, clearScreen: () => box.clearScreen() })`；
  - 否则 → `buildContext(line)` 解析 `@` 上下文 → `chat(contextText + userQuestion)`；
- `box.onClose = exitApp`（保存历史、退出）；
- 保留 `ensureSettings`、`showWelcome` 不变；启动末尾 `box.start()`。

## 六、按键状态流转

```
normal ──输入 `/`(命令起始位)──→ slash(指令菜单)
normal ──输入 `@`──────────────→ at(文件菜单)
slash/at ──Tab/Enter──→ 确认填入 → normal(列表消失)
slash/at ──Esc / 退格删触发符──→ normal
slash/at ──空格(slash)──→ normal
slash/at ──普通字符──→ 更新筛选(保持菜单)
slash/at ──↑/↓──→ 移动选中(保持菜单)
normal ──Enter──→ 换行保留输入 → 提交(命令 or 对话)
normal ──Ctrl+C──→ 退出
```

## 七、实现要点与边界

1. **raw 模式下 `Ctrl+C` 不再默认退出**，在按键处理里手动触发 close 流程（保存历史 → `process.exit`）。
2. **抗闪烁**：普通打字走原地增量（不清行）；菜单类重绘走隐藏光标的全量重绘。两者结合使打字与列表操作都接近无闪烁。
3. **提交保留输入**：`submit()` 先换行再回调，避免随后 `ora` spinner 清当前行而覆盖用户输入。
4. **Windows 终端 ANSI 控制**：清屏、光标移动、隐藏光标均使用标准 ANSI 序列，Windows 10+ 终端与 Git Bash 均支持。
5. **`/clear` 语义**：清屏（`clearScreen`）但保留 `messages`，大模型上下文不丢失。
6. **文件扫描量**：首次 `@` 时递归扫描并缓存到内存，列表仅渲染前 N 条并配合筛选。
7. **`@` 上下文 token**：拼装后会增加请求 token，超大文件本期先不截断，后续可按需加提示/截断。
8. **append-only 输入**：不做行内光标移动，光标恒在末尾；如需行内编辑可后续扩展。
