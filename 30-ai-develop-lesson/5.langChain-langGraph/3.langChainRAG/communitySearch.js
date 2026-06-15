import * as lancedb from "@lancedb/lancedb";
import { LanceDB } from "@langchain/community/vectorstores/lancedb";
import { OpenAIEmbeddings } from "@langchain/openai";

//先连上，并打开你要的表
const db = await lancedb.connect("./lancedb-data");
const existingTable = await db.openTable('table3');


const embeddingModel = new OpenAIEmbeddings({
    modelName: 'text-embedding-v4',
    apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7",
    configuration: {
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },
    // text-embedding-v4 支持指定维度，不写默认 1024
    // dimensions: 1024,
})
//两要素，向量化的大模型，以及langcedb的表 
const existingStore = new LanceDB(embeddingModel, {
    table: existingTable
});
//搜索可以直接给入文本，因为前面一步已经给入了向量化大模型了

const results = await existingStore.similaritySearch("张三", 2);
//相对于直接用langcedb，返回结果做了一层format，做成了langchain指定的document格式
console.log(results);