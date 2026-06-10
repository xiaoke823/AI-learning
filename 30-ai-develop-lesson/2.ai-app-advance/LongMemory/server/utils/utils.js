import fs from "fs"
import { toolList, toolHandleMap, frontList } from "./tools.js"
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { textSearch } from "../vector/index.js";
//同步读取
const sytemContext = fs.readFileSync("./context/context2.md")
//转文本，否则是buffer
const systemString = sytemContext.toString();
export async function summaryMessage(openai, summaryList) {
    const llmres = await openai.chat.completions.create({
        model: "qwen-plus",
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
export async function summaryTitle(openai, list) {
    const llmres = await openai.chat.completions.create({
        model: "qwen-plus",
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
export function readConversation() {
    const jsonStr = fs.readFileSync("./dbdata/conversation.json")
    const jsonObj = JSON.parse(jsonStr);
    return jsonObj;
}
export function writeConversation(obj) {

    const jsonstr = JSON.stringify(obj);
    fs.writeFileSync("./dbdata/conversation.json", jsonstr)

}
export async function requestAI(opt) {
    const { openai, queryObj, userId, convertId, res } = opt
    const conversationObj = readConversation();
    const singleConvertList = conversationObj[userId][convertId].list;
    if (singleConvertList.length > 10) {
        //算出来要截取多少条
        //多截取一些，方便ai接口多给我们总结一下，所以设为6，每次大于10只保留6条。
        let removeNum = singleConvertList.length - 6;
        //如果下一条role为tool，则多截取一条
        if (singleConvertList[removeNum + 1].role === 'tool') {
            removeNum += 1
        }
        const removeList = singleConvertList.splice(1, removeNum)
        const summaryRes = await summaryMessage(openai, removeList);
        singleConvertList.splice(1, 0, summaryRes)
    }
    //每次提问，存到singleConvertList，保存上下文
    singleConvertList.push(queryObj);
    const ragContext = await createRAGContext(queryObj.content)
    const userMemo = await getUserMemoById(userId);
    console.log(userMemo, 'sdasd')
    const llmres = await openai.chat.completions.create({
        model: "qwen-plus",
        messages: [
            {
                role: "system",
                content: systemString
            },
            {
                role: "system",
                content: ragContext
            },
            {
                role: "system",
                content: userMemo
            },
            ...singleConvertList
        ],
        tools: toolList,
        stream: true
    })
    // let chunkList = []
    let resObj = {
        role: "assistant",
        id: "",
        content: ""
    }

    for await (let chunk of llmres) {
        const delta = chunk.choices[0].delta
        resObj.id = chunk.id
        resObj.content += delta.content || ''
        if (delta.tool_calls && delta.tool_calls.length > 0) {
            //拼接tool_calls部分
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
                //你还是第一个chunk,直接走赋值
                resObj.tool_calls = delta.tool_calls;
            }
        } else {
            res.write(`data:${JSON.stringify(resObj)} \n\n`)
        }

        // chunkList.push(chunk)
    }

    singleConvertList.push(resObj);
    writeConversation(conversationObj)

    if (resObj.tool_calls && resObj.tool_calls.length > 0) {
        const tool_calls = resObj.tool_calls
        for (let toolIndex = 0; toolIndex < tool_calls.length; toolIndex++) {
            const singleTool = tool_calls[toolIndex];
            const name = singleTool.function.name;
            const toolarguments = JSON.parse(singleTool.function.arguments);
            if (frontList.indexOf(name) !== -1) {
                //按前端工具卡片逻辑处理
                //不给ai回复，直接给前端下发消息
                const result = await toolHandleMap[name](toolarguments)
                const obj = {
                    role: "tool",
                    content: "此消息无意义,纯粹让前端展示ui卡片",
                    id: singleTool.id,
                    cardName: name,
                    arguments: {
                        ...toolarguments,
                        data: result
                    }
                }

                singleConvertList.push(obj);
                writeConversation(conversationObj)
                res.write(`data:${JSON.stringify(obj)}\n\n`)
                res.end()
            } else {
                const result = await toolHandleMap[name](arguments)
                const toolQueryObj = {
                    role: "tool",
                    content: result,
                    id: singleTool.id
                }
                await requestAI({
                    userId,
                    convertId,
                    openai,
                    res,
                    queryObj: toolQueryObj
                })
            }

        }
    } else {
        res.write(`data:${JSON.stringify({ done: true })} \n\n`)
        res.end()
    }
}

export async function readFileToText(path) {
    const result = fs.readFileSync(path)
    return result.toString();
}
export async function readDocToText() {
    const dirInfo = fs.readdirSync("./doc")
    const docArr = []
    for (let i = 0; i < dirInfo.length; i++) {
        //读取每一个文件读取为文本
        const filename = dirInfo[i];
        const filepath = "./doc/" + filename
        const fileText = await readFileToText(filepath);
        docArr.push(fileText);
    }
    return docArr;
}
export async function splitDoc(docText) {
    const spliter = new RecursiveCharacterTextSplitter({
        chunkSize: 50, //100-50
        chunkOverlap: 20,//和上一段重叠多少
        separators: ["\n\n", "\n", ".", "。", ",", "，", " ", "但是", "."]//分隔符优先级,越靠前优先级越高
    })
    const chunks = await spliter.splitText(docText);
    return chunks;
}
export async function searchByQuestion(qtext) {
    return await textSearch(qtext)
}
export async function createRAGContext(qtext) {
    const ragContext = fs.readFileSync("./context/ragContext.md")
    const searchArr = await searchByQuestion(qtext)
    let allStr = ''
    for (let i = 0; i < searchArr.length; i++) {
        const str = searchArr[i].metadata.text + "\n"
        allStr += str;
    }
    let ragString = ragContext.toString();
    ragString = ragString.replace("${text}", allStr)
    return ragString;
}
export async function getUserMemoById(id) {
    const memoJSonstr = fs.readFileSync("./dbdata/userMemo.json")
    const jsonObj = JSON.parse(memoJSonstr)
    const useMemo = jsonObj[id];
    //做一个自定义转化，转化为字符串在给ai大模型
    let str = "以下是用户的一些特点，请牢记，回答的时候根据用户特点进行回答\n";
    const { sf, like, status } = useMemo
    if (sf) {
        //身份相关的特点写死逻辑，拼到str
        if (sf.career) {
            str += "我的职业是" + sf.career + "\n"
        }
        if (sf.location) {
            str += "我的居住地是" + sf.location + "\n"
        }
    }
    if (like) {
        //身份相关的特点写死逻辑，拼到str
        if (like.career) {
            str += "我喜欢的食物有" + like.food.join(",") + "\n"
        }
        if (like.sport) {
            str += "我喜欢的运动是" + like.sport.join(",") + "\n"
        }
    }
    if (status) {
        //身份相关的特点写死逻辑，拼到str
        if (status.feel) {
            str += "我的感情状态：" + status.feel + "\n"
        }
        if (status.body) {
            str += "我的身体状态" + status.body + "\n"
        }
    }
    return str;
}
