const fs = require("fs")
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
module.exports = {
    summaryMessage,
    readConversation,
    writeConversation,
    summaryTitle
}
