import { StateGraph, Annotation } from "@langchain/langgraph";


//1，自定义数据处理策略
const MyState = Annotation.Root({
    //定义好有哪些属性，没定义的，及时返回也拿不到
    messages: Annotation({
        //每一个节点的，message属性，都会经过reducer方法的处理才给到下一个节点
        reducer: (x, y) => {
            console.log(x, y, "ante")
            return [...x, ...y]
        },
        default: () => undefined
    })
})


//2.创建一个图，只不过这个时候是空白的
const graph = new StateGraph(MyState)
//3，开始往图里加东西，说白了就是你吧你要做的事情，梳理成步骤，每个步骤就是图里的一个节点
//假设我们有一个操作，梳理成了node1,node2,node3三个步骤
//他们很简单,直接 开始->node1->node2->node3->结束
graph
    //addNode——添加节点，把你的步骤都作为节点加进去
    .addNode("node1", (state, config) => {
        //节点的具体代码逻辑
        console.log('node1', state.messages, config.configurable.a);
        return {
            messages: 0.8,

        }
    })
    .addNode("node2", (state, config) => {
        console.log('node2', state.messages, config.configurable.a);
        return {
            messages: "我是node2的结果"
        }
    })
    .addNode("node3", (state, config) => {
        console.log('node3', state.messages, config.configurable.a);
        return {
            messages: "我是node3的结果"
        }
    })
    //addEdge-连接两个节点，其实等于某一步之后下一步是哪
    //内置，__start__开始点，__end__结束点，这是图里自带的，不需要添加，一定存在
    .addEdge("__start__", "node1")
    // .addEdge("node1", "node2")
    .addEdge("node2", "node3")
    .addConditionalEdges("node1", (state, config) => {
        if (state.messages > 0.5) {
            return "node2"
        } else {
            return "__end__"
        }
    })

//编译-把图编译了
const app = graph.compile()

//执行编译后的结果
const result = await app.invoke(
    {
        messages: "开始"
    },
    {
        //配置文件-有两个最关键的

        //最多执行次数
        recursionLimit: 20,
        configurable: {
            //自定义配置-这里面可以随便写东西，
            //比如说用户的id,apiKey
            a: 12312
        }
    })
console.log('result', result);


