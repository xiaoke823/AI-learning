import fs from 'fs'
export async function summaryMessage(openai, messageList) {
    const llmres = await openai.chat.completions.create({
        model: "gui-plus-2026-02-26",
        messages: [
            {
                role:'system',
                content:'帮我总结下面的对话记录，做一个摘要'
            },
            ...messageList
        ]
    })
    return llmres.choices[0].message
}

export function readConversation() {
    const jsonstr = fs.readFileSync('./conversation.json').toString()
    const jsonObj = JSON.parse(jsonstr)
    return jsonObj
}

export function writeConversation(obj) {
    const jsonstr = JSON.stringify(obj)
    fs.writeFileSync('./conversation.json',jsonstr)
}
