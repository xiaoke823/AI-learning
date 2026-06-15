
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { StringOutputParser } from "@langchain/core/output_parsers"



const prompt = ChatPromptTemplate.fromMessages([
    ["system", "你是一个聊天机器人"],
    ["system", "以下是用户的资料{sys}"],
    ["human", "你好，{a}"]
]);

const chain = prompt.pipe({
    invoke: (input) => {
        console.log(input, 'pipe2');
        return input;
    }
}).pipe({
    invoke: (input) => {
        console.log(input, 'pipe3');
        return input;
    }
})

chain.invoke({
    sys: "用户是个男的",
    a: "ai"
});