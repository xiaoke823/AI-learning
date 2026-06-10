const frontList = ['wm_card']

const toolList = [
    {
        type: "function",
        function: {
            name: "help_dp",
            description: "当用户需要订票的时候调用此工具",
            parameters: {
                type: "object",
                properties: {
                    city: {
                        type: "string",
                        description: "用户要去的城市"
                    }
                },
                required: ["city"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "wm_card",
            description: "当用户需要点外卖的时候，调用此工具可以让前端展示一个外卖选择ui结构",
            parameters: {
                type: "object",
                properties: {
                    kind: {
                        type: "string",
                        description: "外卖的种类"
                    }
                },
                required: ["kind"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "buy_wm",
            description: "当用户决定了要点某个外卖的时候，调用此工具进行下单",
            parameters: {
                type: "object",
                properties: {
                    id: {
                        type: "string",
                        description: "要购买的外卖的Id"
                    }
                },
                required: ["id"]
            }
        }
    }
]
const toolHandleMap = {
    //function tool对应的方法逻辑，最后一定要返回一个字符串或者json字符串
    help_dp(arg) {
        //订票的具体逻辑
        return `去往${arg.city}的票订购成功`
    },
    check_store() {
        //查询库存-给回json字符串
        return "库存如下：\n" + JSON.stringify({
            xxx: 12,
            yyy: !4
        })
    },
    //前端卡片工具的方法专门用来获取卡片所需数据
    wm_card() {
        return [
            { name: "煲仔饭1", price: "12", id: 'bz1' },
            { name: "煲仔饭2", price: "22", id: 'bz2' },
            { name: "煲仔饭3", price: "32", id: 'bz3' }
        ]
    },
    buy_wm(arg){
        return `已为您成功下单煲仔饭，id为：${arg.id}。`
    }
}
module.exports = {
    frontList,
    toolList,
    toolHandleMap
}