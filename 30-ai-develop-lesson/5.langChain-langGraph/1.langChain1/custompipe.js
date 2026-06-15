import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { RunnableLambda } from "@langchain/core/runnables"
import fs from 'fs'

const prompt = ChatPromptTemplate.fromMessages([
    ["system", "你是一个聊天机器人"],
    ["system", "以下是用户的资料{sys}"],
    ["human", "你好，{a}"]
]);

const chain = prompt.pipe(new RunnableLambda({
    func:(input)=>{
        fs.writeFileSync('./c.json',JSON.stringify(input))
        return input
    }
}))

chain.invoke({
    sys: "用户是个男的",
    a: "ai"
});