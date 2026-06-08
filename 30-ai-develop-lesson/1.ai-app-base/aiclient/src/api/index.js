import axios from "axios";
import {fetchEventSource} from '@microsoft/fetch-event-source'
export function requestLLM(keyword, userId, convertId,callback) {
    // return axios.get(`http://localhost:3000/llm?keyword=${keyword}&userId=${userId}&convertId=${convertId}`)
    fetchEventSource('http://localhost:3000/llm',{
        method:'POST',
        headers:{
            // 因为我们的请求是json，这样才能解析body
            "Content-Type":"application/json",
            auth:'asdfsadf'
        },
        body:JSON.stringify({
            keyword,
            userId,
            convertId
        }),
        onmessage(event){
            callback(event)
        }
    })
}
export function createConversation(userId) {
    return axios.get("http://localhost:3000/conversation/create?userId=" + userId)
}
export function getConversation(userId, convertId) {
    return axios.get(`http://localhost:3000/conversation/get?userId=${userId}&convertId=${convertId}`)
}
export function listConversation(userId) {
    return axios.get("http://localhost:3000/conversation/list?userId=" + userId)
}
