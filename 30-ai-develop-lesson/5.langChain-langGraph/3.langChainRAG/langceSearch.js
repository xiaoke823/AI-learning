import * as lancedb from "@lancedb/lancedb";
import { OpenAIEmbeddings } from "@langchain/openai";
import fs from "fs"


// 连接数据库（如果路径不存在会自动创建）
const db = await lancedb.connect("./lancedb-data");



//查看有哪些表
const tableList = await db.tableNames();
console.log(tableList);
//打开某个表
const table = await db.openTable("table2");


//指定查询，等同于sql的 select * from table2 where i = 1 limit 10，然后作为数组输出
const queryResult = await table.query().where("i = 1").limit(10).toArray();
//如果你不加条件查找所有就是-const queryResult = await table.query().toArray();
fs.writeFileSync('./result/langceQuery.json', JSON.stringify(queryResult));



//向量检索
const embeddingModel = new OpenAIEmbeddings({
    modelName: 'text-embedding-v4',
    apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7",

    configuration: {
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },
    // text-embedding-v4 支持指定维度，不写默认 1024
    // dimensions: 1024,
})
// 需要自己额外文本转向量
const result = await embeddingModel.embedQuery("张三")
// console.log('result',result)
const vectorResult = await table.search(result).limit(2).toArray();
fs.writeFileSync('./result/langceSearch.json', JSON.stringify(vectorResult));