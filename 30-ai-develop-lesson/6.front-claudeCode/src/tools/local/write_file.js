import fs from 'fs';
import path from 'path';
import { confirm } from '@inquirer/prompts';

export default {
    define: {
        name: "write_file",
        description: "将内容写入到指定文件路径，如果文件已存在则覆盖，如果目录不存在则自动创建。写入前会在终端向用户弹出确认（区分新建/覆盖），用户同意后才会真正落盘——因此无需再额外调用 confirm 工具。",
        inputSchema: {
            type: "object",
            properties: {
                file_path: {
                    type: "string",
                    description: "要写入的文件路径（绝对路径或相对路径）"
                },
                content: {
                    type: "string",
                    description: "要写入文件的内容"
                }
            },
            required: ["file_path", "content"]
        }
    },
    async handle({ file_path, content }) {
        const resolvedPath = path.resolve(file_path);

        // 写入是不可逆操作，强制向用户确认：系统提示词虽已要求写前 confirm，但模型未必每次都自觉调用，
        // 这里兜底——无论模型是否调用过 confirm 工具，真正落盘前都必须经过用户同意
        const exists = fs.existsSync(resolvedPath);
        const agreed = await confirm({
            message: `即将${exists ? '覆盖' : '新建'}文件：${resolvedPath}，是否继续？`,
            default: false,
        });
        if (!agreed) return `用户已取消写入：${resolvedPath}`;

        try {
            const dir = path.dirname(resolvedPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            fs.writeFileSync(resolvedPath, content, 'utf-8');
            //写入的时候额外回传了写入内容 - 为了让他AI反思
            return `文件写入成功: ${resolvedPath}\n\n写入内容:\n${content}`;
        } catch (err) {
            return `文件写入失败: ${err.message}`;
        }
    }
};
