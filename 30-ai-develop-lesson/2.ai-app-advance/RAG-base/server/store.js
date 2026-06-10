import { VectorDb } from "ruvector"
const db = new VectorDb({
    dimensions: 2048,// 维度 64-2048
    storagePath: './data/vectorData.db',//数据按文件存储到这，没有这一项等于做内存储存
    metric: 'cosine' //查找算法 默认cosine，还有Dot等
})

export async function add(id, vector, originText) {
    await db.insert({
        id: id,//必须
        vector: vector,//核心向量数组
        metadata: {
            text: originText
        }
    })
}

export async function get(id) {
    return await db.get(id)
}

export async function search(vector) {
    const searchArr = await db.search({
        vector,
        k: 2
    })
    return searchArr.map(item => {
        return {
            id: item.id,
            metadata: item.metadata,
            score: item.score
        }
    })
}
