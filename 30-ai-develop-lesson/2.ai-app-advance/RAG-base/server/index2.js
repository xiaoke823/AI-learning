//本地做文本转向量
import { pipeline, env } from "@xenova/transformers"
import fs from "fs"
//下载大模型,得到转化工具-因为这个包是从网上下载一个小型的专门做文本转向量的本地模型，来做的转化
//Xenova/bert-base-uncased-768维 Xenova/all-MiniLM-L6-v2-384维
//env设置远程下载地址为国内镜像
env.remoteHost = "https://hf-mirror.com"
const extractor = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2")
//extractor-用来转向量的方法
const arr = [
    "张三今年18岁",
    "李四今年24岁",
    "张三工资6000",
    "李四工资8000",
    "京海市最近雨季",
    "腾飞公司年利润23亿"
]

const result = await extractor(arr)
const resultArr = Array.from(result);
fs.writeFileSync("./b.json", JSON.stringify(resultArr));