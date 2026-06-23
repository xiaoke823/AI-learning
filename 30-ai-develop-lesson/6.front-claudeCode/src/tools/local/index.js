
import LocalClient from './LocalClient.js';
import skill from './skill.js';
import bash from './bash.js';
import grep from './grep.js';
import read_file from './read_file.js';
import write_file from './write_file.js';
import glob from './glob.js';
import confirm from './confirm.js';
import select from './select.js';
// console.log(await glob.handle({
//     pattern: "src/tools/local/*.js",
// }))
export default function getLocalTool() {
    const localClient = new LocalClient();
    localClient.registerTool(skill);
    localClient.registerTool(bash);
    localClient.registerTool(grep);
    localClient.registerTool(read_file);
    localClient.registerTool(write_file);
    localClient.registerTool(glob);
    localClient.registerTool(confirm);
    localClient.registerTool(select);

    const localTools = localClient.listTools();
    //遍历localTools形成map映射
    const localMap = {};
    localTools.tools.forEach((tool) => {
        localMap[tool.name] = localClient
    })
    return {
        localTools: localTools.tools,
        localMap
    }
}