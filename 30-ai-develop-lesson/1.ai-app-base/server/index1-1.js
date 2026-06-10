// 大模型接口
import 'dotenv/config'
import axios from "axios"

axios.post("https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",{
    model:'gui-plus-2026-02-26',
    messages:[
        {
            role:'user',
            content:'你是谁'
        }
    ]
},{
    headers:{
        "Authorization": `Bearer ${process.env.API_KEY}`,
        "Content-Type": "application/json"
    }
}).then(res=>{
    console.log(res.data)
}).catch(err => {
  console.log(err.response?.data || err);
});