import axios from "axios";
export function requestLLM(keyword) {
    return axios.get("http://localhost:3000/llm?keyword=" + keyword)
}