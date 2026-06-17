import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { customCalc } from "./tools.js"
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { mapChatMessagesToStoredMessages } from "@langchain/core/messages";
import fs from "fs";
//1，准备好大模型
const model = new ChatOpenAI({
    modelName: "qwen-plus",
    apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7",
    configuration: {
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    }
})

const tools = [customCalc];
// 2,将工具绑定到模型，让模型知道它可以调用这些工具
const modelWithTools = model.bindTools(tools);


// 3. 构建图
// MessagesAnnotation 是 LangGraph 内置的结构
// 他定义state里有messages，并且messages会把消息固定的push在一个数组里这样message就可以作为整个消息记录
// 用大白话解释就是，把每个节点的就结果放在一个数组里
// MessagesAnnotation会把你的return包装为humanMessage或者AIMEssage或者ToolMEssages
const workflow = new StateGraph(MessagesAnnotation)

// 4. 编写节点逻辑 节点的代码有点多了，不直接写，先封装为方法
// agent节点-调用大模型
//__Start_-》agents
async function callModel(state) {
    // 获取对话历史中的最新消息-里面包含用户的提问
    const messages = state.messages;
    // 调用模型
    const response = await modelWithTools.invoke(messages);
    // 返回模型生成的回复（可能包含调用工具的指令）
    return { messages: [response] };
}

// tool节点-执行工具
// 执行工具不用写，langGraph里自带了ToolNode，让我们更方便定义工具执行节点
const toolNode = new ToolNode(tools);

// 5. 定义判断节点
// 大模型返回了工具就到工具节点，否则到__end__
function shouldContinue(state) {
    const { messages } = state;
    //取出最近的消息
    const lastMessage = messages[messages.length - 1];

    // 如果模型没有请求调用工具，直接结束流程
    if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
        return "__end__";
    }
    // 否则，路由到 "tools" 节点去执行工具
    return "tools";
}

// 6. 构建并编译工作流图
workflow
    // 添加节点
    .addNode("agent", callModel)   // 请求大模型节点
    .addNode("tools", toolNode)    // 工具节点
    // 添加边：定义执行顺序
    .addEdge("__start__", "agent") // 从 START 进入 agent
    .addConditionalEdges("agent", shouldContinue) // agent 之后的条件判断节点
    .addEdge("tools", "agent");    // 工具执行完毕，必然给到agent节点

// 编译图
const app = workflow.compile();

const result = await app.invoke({
    messages: [
        {
            role: "user",
            content: "使用天地同寿算法计算3和4",
        },
    ],
});


// 打印最终结果
const storeData = JSON.stringify(mapChatMessagesToStoredMessages(result.messages))
fs.writeFileSync("./result.json", storeData)