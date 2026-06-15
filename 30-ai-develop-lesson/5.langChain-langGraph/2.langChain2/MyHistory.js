import { BaseChatMessageHistory } from "@langchain/core/chat_history";
import { getUserHistory, writeUserHistory } from "./utils/index.js"
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { mapChatMessagesToStoredMessages, mapStoredMessageToChatMessage } from "@langchain/core/messages";

// function formatHistory(list){
//     // return list.map(item=>{
//     //     const type = item.id[2]
//     //     if(type === 'HumanMessage'){
//     //         return new HumanMessage(item.kwargs.content)
//     //     } else if(type === 'AIMessage'){
//     //         return new AIMessage(item.kwargs.content)
//     //     }
//     // })
//     return list.map(item=>{
//         return mapStoredMessageToChatMessage(item)
//     })
// }

function formatHistory(list) {
    return list.map((item) => {
        return mapStoredMessageToChatMessage(item)
    })
}

export class MyHistory extends BaseChatMessageHistory{
    constructor(userId,sessionId){
        const origin_history = getUserHistory(userId,sessionId)
        super()
        this.messages = formatHistory(origin_history)
        this.userId = userId
        this.sessionId = sessionId
    }
    messages = [];
    addMessages(msg){
        //把大模型的返回结果放进来
        console.log('msg',msg)
        this.messages.push(...msg)
        writeUserHistory(this.userId,this.sessionId,mapChatMessagesToStoredMessages(this.messages))
    }
    getMessages(){
        return this.messages
    }
}