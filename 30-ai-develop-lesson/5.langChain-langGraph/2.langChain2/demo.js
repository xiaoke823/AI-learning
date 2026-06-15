//引入express-一个非常简单的node服务库
import express from "express";
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { AIMessage, HumanMessage } from "@langchain/core/messages"
import { getUserHistory, writeUserHistory } from "./utils/index.js"

const app = express();

//准备一个数组来储存对话记录
let arr = [];
app.get("/llm", async (req, res) => {
    //获取用户体的问题
    const { q, userId, seesionId } = req.query;
    //根据用户id和对话id，从文件/数据库里找出对应记录
    arr = getUserHistory(userId, seesionId)
    //构建消息模板
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", "你是一个有用的助手"],
        new MessagesPlaceholder("history"),
        ["human", "{question}"],
    ]);
    //构建大模型请求对象
    const chat = new ChatOpenAI({
        modelName: "qwen-plus",
        apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7",
        configuration: {
            baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
        }
    })
    //构建链条
    const chain = prompt.pipe(model).pipe(new StringOutputParser());


    //执行链条，替换question为用户问题，history为历史记录数组
    const result = await chain.invoke({
        question: q,
        history: arr,
    });
    console.log(result);
    //请求完成后，写入用户提的问题，以及ai的回答
    arr.push(new HumanMessage(q), new AIMessage(result))
    writeUserHistory(userId, seesionId, arr);
    //返回给前端
    res.send(result);
});

app.listen(3000)