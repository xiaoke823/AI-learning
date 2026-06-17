import { BaseCheckpointSaver } from "@langchain/langgraph";
import fs from 'fs';


export class FileSystemSaver extends BaseCheckpointSaver {
    constructor() {
        super();
    }

    writeUserHistory(userId, seesionId, history) {
        console.log(userId, seesionId, 'write')
        const userPath = `./chat/${userId}.json`;
        const userHistory = JSON.parse(fs.readFileSync(userPath).toString());
        userHistory[seesionId] = history;
        fs.writeFileSync(userPath, JSON.stringify(userHistory))
    }

    getUserHistory(userId, seesionId) {
        const userPath = `./chat/${userId}.json`;
        const isExist = fs.existsSync(userPath)

        if (isExist) {
            const userHistory = JSON.parse(fs.readFileSync(userPath).toString());
            const seesionHistory = userHistory[seesionId] || {};
            return seesionHistory;
        } else {
            fs.writeFileSync(userPath, JSON.stringify({
                [seesionId]: {}
            }))
            return undefined
        }
    }

    // 1. 保存检查点（必需实现）
    async put(config, writes, metadata) {
        console.log("put", config)
        const userId = config.configurable.userId;
        const sessionId = config.configurable.sessionId;
        this.writeUserHistory(userId, sessionId, {
            checkpoint: writes,
            metadata: metadata
        })
        return {
            configurable: {
                userId: userId,
                sessionId: sessionId,

            }
        };
    }

    // 2. 获取检查点（必需实现）- 返回 tuple 格式
    async getTuple(config) {
        //根据用户id查询到之前的记录，继续回复对话，如果不存在就是新对话
        const userId = config.configurable.userId;
        const sessionId = config.configurable.sessionId;

        const history = this.getUserHistory(userId, sessionId)
        const checkpoint = history?.checkpoint
        if (checkpoint) {
            //已经存在的对话
            return {
                config: {
                    configurable: {
                        userId: userId,
                        sessionId: sessionId  // "1f13b09e-48a7-6661-8003-9f79c0e03a20"
                    }
                },
                checkpoint: checkpoint,  // 你的完整 checkpoint 对象-就是我们的对话记录
                metadata: history.metadata,      // { source: "loop", step: 3, ... 
            };
        } else {
            //新对话。return undefined
            return undefined;
        }
    }

    // 3. 保存待处理的写入（必需实现）
    async putWrites(config, writes, taskId) {

    }
}