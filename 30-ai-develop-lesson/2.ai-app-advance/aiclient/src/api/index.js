import axios from "axios";
import { fetchEventSource } from "@microsoft/fetch-event-source"
export function requestLLM(keyword, userId, convertId, callback) {
    fetchEventSource("http://localhost:3000/llm", {
        method: "POST",
        headers: {
            //因为我们请求时json，这样后端才能解析body
            "Content-Type": "application/json",
            auth: "asdasdasdas"
        },
        body: JSON.stringify({
            keyword,
            userId,
            convertId
        }),
        onmessage(event) {
            callback(event);
        }
    })
    // return axios.get(`http://localhost:3000/llm?keyword=${keyword}&userId=${userId}&convertId=${convertId}`)
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
