import { tool } from "@langchain/core/tools";
import { z } from "zod";

// 1. 定义一下工具
export const customCalc = tool(
    async (arg) => {
        return "计算结果为：" + (arg.a + arg.b);
    },
    {
        name: "custom_calc",
        description: "当用户让你使用天地同寿算法，计算的时候，执行此工具",
        schema: z.object({
            a: z.number().describe("用于计算的第一个数字"),
            b: z.number().describe("用于计算的第二个数字")
        }),
    }
);
export const toolMap = {
    [customCalc.name]: customCalc
}