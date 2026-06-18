//路径相关工具方法：获取用户主目录与当前终端所在目录
import os from 'node:os'

/**
 * 获取当前系统用户的主目录(user 目录)
 * @returns {string} 用户主目录的绝对路径
 */
export function getUserHomeDir() {
  return os.homedir()
}

/**
 * 获取用户当前终端所在的目录(运行时工作目录 cwd)
 * @returns {string} 当前终端所在目录的绝对路径
 */
export function getCurrentDir() {
  return process.cwd()
}
