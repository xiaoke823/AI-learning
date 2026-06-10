const fs = require("fs")
const { toolList, toolHandleMap,frontList } = require("./tools.js")

//同步读取
const sytemContext = fs.readFileSync("./context2.md")
//转文本，否则是buffer
const systemString = sytemContext.toString();

async function summaryMessage(openai, summaryList) {
    const llmres = await openai.chat.completions.create({
        model: "gui-plus-2026-02-26",
        messages: [
            {
                role: "system",
                content: "帮我总结下面的对话记录，做一个摘要"
            },
            ...summaryList
        ]
    })

    return llmres.choices[0].message;
}
async function summaryTitle(openai, list) {
    const llmres = await openai.chat.completions.create({
        model: "gui-plus-2026-02-26",
        messages: [
            {
                role: "system",
                content: "帮我总结下面的对话记录，生成一个小于16个字的标题"
            },
            ...list
        ]
    })

    return llmres.choices[0].message.content;
}
function readConversation() {
    const jsonStr = fs.readFileSync("./conversation.json")
    const jsonObj = JSON.parse(jsonStr);
    return jsonObj;
}
function writeConversation(obj) {

    const jsonstr = JSON.stringify(obj);
    fs.writeFileSync("./conversation.json", jsonstr)

}
async function requestAI(obj) {
    const { openai, queryObj, userId, convertId, res } = obj
    const conversationObj = readConversation();
    //防御边界
    if (!conversationObj[userId] || !conversationObj[userId][convertId]) {
        res.write(`data:${JSON.stringify({ error: "对话不存在，请重新创建" })} \n\n`)
        res.end()
        return
    }
    const singleConvertList = conversationObj[userId][convertId].list;
    
    // 截取防止上下文太长
    if (singleConvertList.length > 10) {
        //算出来要截取多少条
        //多截取一些，方便ai接口多给我们总结一下，所以设为6，每次大于10只保留6条。
        const removeNum = singleConvertList.length - 6;
        //如果下一条role为tool，则多截取一条
        if(singleConvertList[removeNum+1].role === 'tool') {
            remove += 1
        }
        const removeList = singleConvertList.splice(1, removeNum)
        const summaryRes = await summaryMessage(openai, removeList);
        singleConvertList.splice(1, 0, summaryRes)
    }
    //每次提问，存到singleConvertList，保存上下文
    singleConvertList.push(queryObj);
    // console.log(singleConvertList);

    //带着提问去请求大模型
    const llmres = await openai.chat.completions.create({
        model: "gui-plus-2026-02-26",
        messages: [
            {
                role: "system",
                content: systemString
            },
            ...singleConvertList
        ],
        tools: toolList,
        stream: true
    })

    let resObj = {
        role: "assistant",
        id: "",
        content: ""
    }
    //读取流
    for await (let chunk of llmres) {
        const delta = chunk.choices[0].delta
        resObj.id = chunk.id
        resObj.content += delta.content || ''
        //如果存在使用了function tool 的情况
        if (delta.tool_calls && delta.tool_calls.length > 0) {
            //拼接tool_calls部分（因为toolcalls也是流，要拼接完返回才能去执行
            if (resObj.tool_calls) {
                //已经是第一个以后的chunk，走拼接
                delta.tool_calls.forEach((chunkTool) => {
                    const toolIndex = chunkTool.index;
                    //根据index找到resObj，要拼接进去的对象
                    const targetTool = resObj.tool_calls[toolIndex]
                    if (chunkTool.function?.name) {
                        targetTool.function.name += chunkTool.function?.name
                    }
                    if (chunkTool.function?.arguments) {
                        targetTool.function.arguments += chunkTool.function?.arguments
                    }
                })

            } else {
                //如果是第一个chunk,直接走创建并赋值
                resObj.tool_calls = delta.tool_calls;
                // 确保 arguments 初始化为空字符串，避免后续拼接时出现 "undefined..."
                resObj.tool_calls.forEach(tool => {
                    if (tool.function && tool.function.arguments === undefined) {
                        tool.function.arguments = '';
                    }
                });
            }
        } else {
            res.write(`data:${JSON.stringify(resObj)} \n\n`)
        }

        // chunkList.push(chunk)
    }

    //每次回答，存到singleConvertList，保存上下文
    singleConvertList.push(resObj);
    writeConversation(conversationObj)

    //如果大模型调用了tool，则遍历toolcalls，
    // 并根据call开始执行tool，最后把tool的返回再给大模型
    if (resObj.tool_calls && resObj.tool_calls.length > 0) {
        const tool_calls = resObj.tool_calls
        for (let i = 0; i < tool_calls.length; i++) {
            const singleTool = tool_calls[i]
            const name = singleTool.function.name;
            const arguments = JSON.parse(singleTool.function.arguments)
            if(frontList.indexOf(name)!== -1) {
                
                //按前端卡片逻辑处理
                //不给ai回复，直接给前端下发消息

                //这里这个obj实际上还是会加入到大模型对话队列中，
                // 所以content可设置成无意义来防止大模型误解
                const result = await toolHandleMap[name](arguments)
                const obj = {
                    role:'tool',
                    content:'此消息无意义，纯粹让前端展示ui卡片',
                    cardName: name,
                    arguments: {
                        ...arguments,
                        data:result
                    },
                    tool_call_id: singleTool.id
                }
                
                singleConvertList.push(resObj);
                writeConversation(conversationObj)
                res.write(`data:${JSON.stringify(obj)}\n\n`);
                res.end()
            } else{
                // 根据name和arg调用function tool
                const result = await toolHandleMap[name](arguments)
                // 包装queryObj
                const toolQueryObj = {
                    role: 'tool',
                    content: result,
                    tool_call_id: singleTool.id
                }
                //然后开始递归，因为需要调用大模型，而大模型可能还会再调用function tool
                await requestAI({
                    userId,
                    convertId,
                    openai,
                    res,
                    queryObj:toolQueryObj
                })
            }
            
        }
    } else {
        res.write(`data:${JSON.stringify({ done: true })} \n\n`)
        res.end()
    }
}
module.exports = {
    summaryMessage,
    readConversation,
    writeConversation,
    summaryTitle,
    requestAI
}
