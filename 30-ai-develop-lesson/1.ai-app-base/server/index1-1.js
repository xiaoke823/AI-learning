// 大模型接口
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
        "Authorization": "Bearer sk-d5b24677b0e24f0da678029127102586",
        "Content-Type": "application/json"
    }
}).then(res=>{
    console.log(res.data)
}).catch(err => {
  console.log(err.response?.data || err);
});