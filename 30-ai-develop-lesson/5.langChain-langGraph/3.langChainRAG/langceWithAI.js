import * as lancedb from "@lancedb/lancedb";
import { OpenAIEmbeddings } from "@langchain/openai";
const db = await lancedb.connect("./lancedb-data");
const texts = [
    "张三最有钱。",
    "李四长得帅",
    "王五智商高",
];
//配合向量化，并储存本地
const embeddingModel = new OpenAIEmbeddings({
    modelName: 'text-embedding-v4',
    apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7",

    configuration: {
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },
    // text-embedding-v4 支持指定维度，不写默认 1024
    // dimensions: 1024,
})

//建议走embedQuery,遍历向量化。这样可以直接形成要储存的对象
const storeArr = [];
for (let i = 0; i < texts.length; i++) {
    const result = await embeddingModel.embedQuery(texts[i])
    storeArr.push({
        i: i,
        text: texts[i],
        vector: result
    })
}



//初始化数据里vector是多少纬，后续就只能是多少纬，i只能为数组，text只能为字符串
const table2 = await db.createTable("table2", storeArr, {
    //mode说明是重写还是新建，建议重写，反正重写如果不存在也会新建，如果存在则顶替
    mode: "overwrite"
})
//查看schema（也就是表结构）
console.log(await table2.schema())