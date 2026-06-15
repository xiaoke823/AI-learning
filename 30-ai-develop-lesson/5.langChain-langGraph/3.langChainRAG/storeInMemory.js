import { OpenAIEmbeddings } from "@langchain/openai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
//只能存在内存里
import fs from "fs"

const textArr = [
    "张三很有钱",
    "李四很帅",
    "王五很聪明"
]
// 初始化向量化模型
const embeddingModel = new OpenAIEmbeddings({
    modelName: 'text-embedding-v4',
    apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7",

    configuration: {
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },
    // text-embedding-v4 支持指定维度，不写默认 1024
    // dimensions: 1024,
})


//只能接受转化整个textArr，模型在第三个参数传入，他会在里面帮你调用模型转向量，不用自己掉
//到时候你就在服务器启动的时候执行，拿到的vectorStore别丢，后面的搜索和查看到要用
const vectorStore = await MemoryVectorStore.fromTexts(
    textArr,
    //metadata-第二个参数一定是一个数组，顺序和你的textArr一一对应
    [
        {
            id: 1
        },
        {
            id: 2,
        },
        {
            id: 3
        }
    ],
    embeddingModel
);


//获取所有储存
const allMemory = vectorStore.memoryVectors;
fs.writeFileSync("./result/allMemory.json", JSON.stringify(allMemory));
//搜索-一步到位，不需要自己去把搜索关键词转向量
const results = await vectorStore.similaritySearch('谁最有钱', 2);
//直接取出第1个结果的原文本-用的时候使用pageContent，你把结果写为json，文本部分会变成content
console.log(results[0].pageContent)
fs.writeFileSync("./result/searchresults.json", JSON.stringify(results));