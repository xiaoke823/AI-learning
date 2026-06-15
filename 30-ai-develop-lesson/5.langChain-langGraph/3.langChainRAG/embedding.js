import { OpenAIEmbeddings } from "@langchain/openai";

import fs from "fs"
// 初始化嵌入模型
const embeddingModel = new OpenAIEmbeddings({
    modelName: 'text-embedding-v4',
    apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7",

    configuration: {
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },
    // text-embedding-v4 支持指定维度，不写默认 1024
    // dimensions: 1024,
})

const single = "张三很有钱"
const textArr = [
    "张三很有钱",
    "李四很帅",
    "王五很聪明"
]

// 向量化单个文本
const embedding = await embeddingModel.embedQuery(single);
fs.writeFileSync("./result/embedding1.json", JSON.stringify(embedding));
// 向量化多个
const batchEmbeddings = await embeddingModel.embedDocuments(textArr);
fs.writeFileSync("./result/batchEmbeddings1.json", JSON.stringify(batchEmbeddings));

