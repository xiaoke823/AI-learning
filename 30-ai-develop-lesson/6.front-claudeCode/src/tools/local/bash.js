import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

const getPlatform = () => {
    return os.platform() === 'win32' ? 'windows' : 'others';
};




export default {
    define: {
        name: "bash",
        description: "当需要做一些不能通过其他工具完成的事情，可以借助该工具，通过给入Bash指令完成操作。Windows 系统用 PowerShell 执行，其它系统直接执行。注意：Windows(PowerShell) 下 curl 是 Invoke-WebRequest 的别名而非真正的 curl，请改用 curl.exe（如 curl.exe ifconfig.me），否则可能因参数缺失进入交互提示而卡死",
        inputSchema: {
            type: "object",
            properties: {
                command: {
                    type: "string",
                    description: "具体的要执行的Bash指令，注意区分用户的操作系统，产出合适的指令"
                }
            },
            required: ["command"]
        }
    },

    async handle({ command }) {
        // 1. 获取AI命令


        // 2. 判断系统并执行
        const platform = getPlatform();
        let finalCommand = command;

        if (platform === 'windows') {
            //cmd不能执行bash，所以window下用powershell执行
            // -NoProfile：跳过用户配置文件，避免别名/提示词干扰；-NonInteractive：非交互模式，命令缺参数或触发读取输入时直接报错退出，而不是阻塞等待 stdin 导致整个工具卡死
            finalCommand = `chcp 65001 >nul && powershell -NoProfile -NonInteractive -Command "${command}"`;
        }

        // 3. 执行
        try {
            // timeout：兜底超时，防止个别命令挂起导致工具永久阻塞；maxBuffer：放宽输出缓冲，避免大输出报错
            const { stdout, stderr } = await execAsync(finalCommand, {
                encoding: 'utf8',
                timeout: 60000,
                maxBuffer: 10 * 1024 * 1024,
            });
            return `执行成功:\n${stdout}${stderr ? '\n' + stderr : ''}`;
        } catch (error) {
            // 超时被 kill：error.killed 为真，或 message 含 "timed out"。返回明确提示，便于模型改用非交互命令重试
            if (error.killed || /timed out/i.test(error.message || '')) {
                return `执行失败: 命令超时（60s 未返回），可能是命令进入了交互式等待（如 Windows 下 curl 被当成 Invoke-WebRequest）。请改用非交互命令，Windows 下用 curl.exe 代替 curl。`;
            }
            // exec 在非 0 退出时会把 stdout/stderr 附在 error 上，一并返回便于模型判断
            return `执行失败: ${error.stderr || error.stdout || error.message}`;
        }
    }
};
// const result = await a.handle({
//     command: "ping baidu.com"
// });
// console.log(result);