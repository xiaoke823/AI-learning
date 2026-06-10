import fs from "fs"
import OpenAI from "openai";
export function getUserConvertList(userId) {
    const jsonStr = fs.readFileSync("./dbdata/conversation.json")
    const jsonObj = JSON.parse(jsonStr);
    const userConvertIdList = Object.keys(jsonObj[userId])
    const conversationArr = [];
    for (let i = 0; i < userConvertIdList.length; i++) {
        const _id = userConvertIdList[i];
        const convertList = jsonObj[userId][_id];
        //如果需要，可以限定截取最近50,100,30
        conversationArr.push(convertList)
    }
    return conversationArr;
}
export function storeIn(userId, type, result) {
    const memojsonStr = fs.readFileSync("./dbdata/userMemo.json")
    const memojsonObj = JSON.parse(memojsonStr);
    const memoInObj = memojsonObj[userId]?.[type] || {}
    const resultContent = JSON.parse(result.content);
    //如果本次生成没有提取到特点，应该不去替换

    for (let key in resultContent) {
        if (resultContent[key]) {
            memoInObj[key] = resultContent[key]
        }
    }

    if (memojsonObj[userId]) {
        memojsonObj[userId][type] = memoInObj;
    } else {
        memojsonObj[userId] = {};
        memojsonObj[userId][type] = memoInObj
    }

    fs.writeFileSync("./dbdata/userMemo.json", JSON.stringify(memojsonObj));

}
export async function getUserLiker(conversationArr, md) {
    const openai = new OpenAI({
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7"
    })
    // const memoContext = fs.readFileSync("./context/memoContext.md")
    const llmres = await openai.chat.completions.create({
        model: "qwen-plus",
        messages: [
            {
                role: "system",
                content: md
            },
            {
                role: "user",
                content: JSON.stringify(conversationArr)
            }
        ]
    })

    return llmres.choices[0].message
}
export async function getUserMemory(userId) {
    //第一步，根据id找出用户最近的对话
    const jsonStr = fs.readFileSync("./dbdata/conversation.json")
    const jsonObj = JSON.parse(jsonStr);
    const userConvertIdList = Object.keys(jsonObj[userId])
    const conversationArr = [];
    for (let i = 0; i < userConvertIdList.length; i++) {
        const _id = userConvertIdList[i];
        const convertList = jsonObj[userId][_id];
        //如果需要，可以限定截取最近50,100,30
        conversationArr.push(convertList)
    }

    //第二步，把记录给到ai，让ai给我们生成用户的喜好
    const result = await getUserLiker(conversationArr)
    //第三部，根据用户喜好存入数据库
    const memojsonStr = fs.readFileSync("./dbdata/userMemo.json")
    const memojsonObj = JSON.parse(memojsonStr);
    memojsonObj[userId] = result.content;
    fs.writeFileSync("./dbdata/userMemo.json", JSON.stringify(memojsonObj));
}

export async function createSf(userId) {
    //第一步，根据id找出用户最近的对话
    const conversationArr = getUserConvertList(userId);
    //这里建议你做一个截取-根据你的特点要求，截取一部分，比如身份截取最近50条

    //读取身份相关的生成上下文
    const sfMemo = fs.readFileSync("./context/sfMemo.md")
    //第二步，把记录给到ai，让ai给我们生成用户的喜好
    const result = await getUserLiker(conversationArr, sfMemo.toString())
    //第三部，根据用户喜好存入数据库
    storeIn(userId, 'sf', result)
    //di
}
export async function createLike(userId) {
    //第一步，根据id找出用户最近的对话
    const conversationArr = getUserConvertList(userId);
    //读取喜好相关的生成上下文
    const sfMemo = fs.readFileSync("./context/likeMemo.md")
    //第二步，把记录给到ai，让ai给我们生成用户的喜好
    const result = await getUserLiker(conversationArr, sfMemo.toString())
    //第三部，根据用户喜好存入数据库
    storeIn(userId, 'like', result)
}
export async function createStatus(userId) {
    //第一步，根据id找出用户最近的对话
    const conversationArr = getUserConvertList(userId);
    //读取状态相关的生成上下文
    const sfMemo = fs.readFileSync("./context/statusMemo.md")
    //第二步，把记录给到ai，让ai给我们生成用户的喜好
    const result = await getUserLiker(conversationArr, sfMemo.toString())
    //第三部，根据用户喜好存入数据库
    storeIn(userId, 'status', result)
}
createSf('001');
createLike('001');
createStatus('001')
// getUserMemory("001")