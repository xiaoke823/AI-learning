//引入express-一个非常简单的node服务库
import express from 'express'
//cors-专门解决跨域问题的
import cors from 'cors'
//openai-专门用来按标准请求大模型接口的一个sdk库，
import openai from 'openai'
//创建了一个express服务对象
const app = express();
//设置跨域
app.use(cors())
//到时候请求-localhost:3000/llm?keyword="用户输入的问题" 
app.get("/llm", async (req, res) => {
    const keyword = req.query.keyword;
    
})

//把服务开启来了开在了3000端口
app.listen(3000)