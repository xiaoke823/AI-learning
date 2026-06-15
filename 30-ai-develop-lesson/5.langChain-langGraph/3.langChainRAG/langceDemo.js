import * as lancedb from "@lancedb/lancedb";
import { OpenAIEmbeddings } from "@langchain/openai";
// 连接数据库（如果路径不存在会自动创建）
const db = await lancedb.connect("./lancedb-data");
//以初始数据建表，表的每一列都会按初始数据来规定字段和类型
await db.createTable("table1",
    [
        //创建表一定要给一个初始数据，这个初始数据决定了表的字段和类型
        {
            a: 123,
            b: ""
        }
    ],
    {
        //mode说明是重写还是新建，建议重写，反正重写如果不存在也会新建，如果存在则顶替
        mode: "overwrite"
    }
)
// 打开表
const table1 = await db.openTable('table1');
//加入-必须和初始数据一样的字段和类型
await table1.add([{
    a: 123,
    b: "123"
}]);




