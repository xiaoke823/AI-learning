import { VectorDb } from "ruvector"
const db = new VectorDb({
    dimensions: 2048,//维度，
    storagePath: "./data/vectorData.db",//数据按文件储存到这，没有这一项，等于做内存储存
    //Cosine,Euclidean,DotProduct
    metric: "Cosine"//查找算法
});

export async function add(id, vector, originText) {

    const res = await db.insert({
        id: id,//必须,
        vector: vector,//向量数组,
        metadata: {
            text: originText
        }
    })


}

export async function get(id) {
    return await db.get(id)
}
export async function search(searchVector) {
    const searchArr = await db.search({
        vector: searchVector,
        k: 5
    })
    return searchArr.map((r) => {
        return {
            id: r.id,
            score: r.score,
            metadata: r.metadata
        }
    })
}