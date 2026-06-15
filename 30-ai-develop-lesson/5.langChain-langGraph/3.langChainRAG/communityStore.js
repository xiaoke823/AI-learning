import { OpenAIEmbeddings } from "@langchain/openai";
import { LanceDB } from "@langchain/community/vectorstores/lancedb";

const texts = [
    "张三最有钱。",
    "李四长得帅",
    "王五智商高",
];

const embeddingModel = new OpenAIEmbeddings({
    modelName: 'text-embedding-v4',
    apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7",

    configuration: {
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    },
    // text-embedding-v4 支持指定维度，不写默认 1024
    // dimensions: 1024,
})

//固定格式，不能随便改,所以这里map把texts转为指定格式
const documents = texts.map((text, index) => ({
    pageContent: text,
    metadata: {
        //可以随便塞什么你想要
        id: index,
    },
}));
//一个方法完成文本转向量-》用lancedb储存了
//通过社区的LanceDB包装类，一键写入
const vectorStore = await LanceDB.fromDocuments(
    documents,//text数组
    embeddingModel,//向量转化大模型对象
    {
        uri: "./lancedb-data",  //要connect地址
        tableName: 'table3',//table名字
        mode: 'overwrite',//模式
    }
);

//vectorStore是LangceDB对象，这里等同于我们之前的db.createTable.
//所以如果你需要可以继续拿着vectorStore进行addVector或者addDocument