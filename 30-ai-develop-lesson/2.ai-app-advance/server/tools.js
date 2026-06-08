const toolList = [
    {
        type: "function",
        function: {
            name: "help_dp",
            description: "当用户需要订票的时候调用此工具",
            parameters: {
                city: {
                    type: "string",
                    description: "用户要去的城市"
                }
            }
        }
    }
]
const toolHandleMap = {
    help_dp() {
        //订票的具体逻辑
    },
    help_dc() {
        //打车的逻辑
    }
}
module.exports = {
    toolList,
    toolHandleMap
}