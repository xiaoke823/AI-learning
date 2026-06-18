//加载项目根目录下的 .env，路径基于本模块位置解析，与运行时所在目录(cwd)无关
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// 本模块位于 src/utils，项目根目录在向上两级
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../.env') })
