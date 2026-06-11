export const frontList = ['wm_card'];
export const toolList = [

    {
        type: "function",
        function: {
            name: "wm_card",
            description: "当用户需要点外卖的时候，调用此工具可以让前端展示一个外卖选择ui结构",
            parameters: {
                kind: {
                    type: "string",
                    description: "外卖的种类"
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "buy_wm",
            description: "当用户决定了要点某个外卖的时候，调用此工具进行下单",
            parameters: {
                id: {
                    type: "string",
                    description: "要购买的外卖的Id"
                }
            }
        }
    }
]
export const toolHandleMap = {

    check_store() {
        //查询库存-给回json字符串
        return {
            content: [
                {
                    type: "text",
                    text: "库存如下：\n" + JSON.stringify({
                        xxx: 12,
                        yyy: !4
                    })
                }
            ]
        }
    },
    //前端卡片工具的方法专门用来获取卡片所需数据
    wm_card() {
        return [
            { name: "煲仔饭1", price: "12", id: 'bz1' },
            { name: "煲仔饭2", price: "22", id: 'bz2' },
            { name: "煲仔饭3", price: "32", id: 'bz3' }
        ]
    },
    buy_wm(arg) {
        const id = arg.id

        return {
            content: [
                {
                    type: "text",
                    text: `${id}商品已经下单成功，花费23.3`
                }
            ]
        }

    }
}
