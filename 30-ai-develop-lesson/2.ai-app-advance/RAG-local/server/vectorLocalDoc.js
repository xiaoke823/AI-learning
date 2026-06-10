import { readFileToText, readDocToText, splitDoc, searchByQuestion, createRAGContext } from "./utils.js"
import { storeIn } from "./vector/index.js";
const arr = await readDocToText();
for (let i = 0; i < arr.length; i++) {
    const resultArr = await splitDoc(arr[i]);

    for (let j = 0; j < resultArr.length; j++) {
        const text = resultArr[j];
        await storeIn(text)
    }
}

// const arr = await createRAGContext("请假")
