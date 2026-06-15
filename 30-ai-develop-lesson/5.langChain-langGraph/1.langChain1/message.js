
import { HumanMessage } from "@langchain/core/messages";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"

const chat = ChatPromptTemplate.fromTemplate("你好，{a}")

const prompt = ChatPromptTemplate.fromMessages([
    ["system", "你是一个聊天机器人"],
    ["system", "以下是用户的资料{sys}"],
    // new MessagesPlaceholder("historyPlaceholder"),
    new MessagesPlaceholder("s"),
    ["human", "你好，{a}"]
]);

// const res = await chat.invoke({ a: "ai" });
const res = await prompt.invoke({
    sys: "用户是个男的",
    s: "你好",
    a: "ai"
});
console.log(res)