
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts"
import { RunnableLambda, RunnableMap } from "@langchain/core/runnables";
import fs from "fs"
const prompt = ChatPromptTemplate.fromMessages([
    ["human", "你好，这个衣服的价格为{price}，库存是{store}"]
]);

const getPrice = new RunnableLambda({
    func: async () => {
        const price = await new Promise((resolve) => {
            setTimeout(() => {
                resolve(200)
            }, 1000)
        })
        return price
    }
})
const getStore = new RunnableLambda({
    func: async (priceObj) => {
        const store = await new Promise((resolve) => {
            setTimeout(() => {
                resolve(1000)
            }, 1000)
        })
        return store
    }
})
const request = RunnableMap.from({
    price: getPrice,
    store: getStore
})

const chain = request.pipe(prompt)
const res = await chain.invoke();

console.log(res);