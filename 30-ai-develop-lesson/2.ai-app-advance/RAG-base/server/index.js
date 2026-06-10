import 'dotenv/config'
import OpenAI from "openai/index.js"
import fs from "fs";
import { add, get,search } from "./store.js";
const openai = new OpenAI({
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    apiKey: process.env.API_KEY,
})
const arr = [
    "张三今年18岁",
    "李四今年24岁",
    "张三工资6000",
    "李四工资8000",
    "京海市最近雨季",
    "腾飞公司年利润23亿"
]

const result = await openai.embeddings.create({
    model:'text-embedding-v4',
    input:arr,
    dimensions:2048
})
// fs.writeFileSync('./a.json',JSON.stringify(result))
const resultData = result.data

for(let i = 0;i<resultData.length;i++){
    await add(i+'',resultData[i].embedding,arr[i])
}

// const getResult = await get('2')
// console.log(getResult)


//检索-》不能直接拿文本检索向量，要先把提问的文本也转成向量，而且要和前面保持一致
//1.把药检索的文本转成向量
//2.调用db的search方法，给入我们要传入的提问向量
const questionResult = await openai.embeddings.create({
    model:'text-embedding-v4',
    input:['介绍一下天气'],
    dimensions:2048
})
let questionData = questionResult.data
//因为这里的文本只有一个
const questionVector = questionData[0].embedding
const searchRes = await search(questionVector)
console.log(searchRes)