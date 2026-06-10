import 'dotenv/config'
import { readFileToText, readDocToText, splitDoc, searchByQuestion,createRAGContext } from './utils.js'
import { storeIn } from './vector/index.js'

// const res = await readFileToText('./doc/绩效制度.txt')
// console.log(res)

// 存储-一般当文件有更新的时候需要更新
const arr = await readDocToText()
for (let i = 0; i < arr.length; i++) {
    const element = arr[i];
    const resArr = await splitDoc(element)
    for (let j = 0; j < resArr.length; j++) {
        const text = resArr[j];
        console.log(text)
        await storeIn(text)
    }
}

// 搜索
// const resArr = await createRAGContext('请假')
// console.log(resArr)