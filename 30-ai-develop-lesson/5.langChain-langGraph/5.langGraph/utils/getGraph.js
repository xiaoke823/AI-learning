import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { customCalc } from "../tools.js";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { FileSystemSaver } from "./FileCheckpointSaver.js";
export function getGraph() {
    const model = new ChatOpenAI({
        modelName: "qwen-plus",
        apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7",
        configuration: {
            baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
        }
    })

    const tools = [customCalc];
    const modelWithTools = model.bindTools(tools);
    const workflow = new StateGraph(MessagesAnnotation);

    async function callModel(state) {
        const messages = state.messages;
        const stream = await modelWithTools.stream(messages);
        let fullResponse = null
        for await (const chunk of stream) {
            if (!fullResponse) {
                fullResponse = chunk;
            } else {
                // 合并 chunks
                fullResponse = fullResponse.concat(chunk);
            }
        }
        return { messages: [fullResponse] };
    }

    const toolNode = new ToolNode(tools);

    function shouldContinue(state) {
        const { messages } = state;
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
            return "__end__";
        }
        return "tools";
    }

    workflow
        .addNode("agent", callModel)
        .addNode("tools", toolNode)

        .addEdge("__start__", "agent")
        .addConditionalEdges("agent", shouldContinue)
        .addEdge("tools", "agent");
    const checkpointer = new FileSystemSaver();
    return workflow.compile({
        checkpointer: checkpointer
    });
}
