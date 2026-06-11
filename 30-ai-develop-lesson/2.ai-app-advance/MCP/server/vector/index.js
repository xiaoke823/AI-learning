import OpenAI from "openai"

import { add, search } from "./store.js";

export async function createVetor(text) {
    const openai = new OpenAI({
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7"
    })
    const result = await openai.embeddings.create({
        model: "text-embedding-v4",
        input: [text],
        dimensions: 2048
    })
    return result.data[0].embedding
}
export async function storeIn(text) {
    const vector = await createVetor(text)
    await add(text, vector, text)
}

export async function textSearch(text) {
    const textVector = await createVetor(text)
    const searchResult = await search(textVector);
    return searchResult
}




