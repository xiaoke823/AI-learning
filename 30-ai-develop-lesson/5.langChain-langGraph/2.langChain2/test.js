import { mapStoredMessageToChatMessage } from "@langchain/core/messages";
import { load } from "@langchain/core/load";
const de = await load(JSON.stringify({
    "lc": 1,
    "type": "constructor",
    "id": [
        "langchain_core",
        "messages",
        "HumanMessage"
    ],
    "kwargs": {
        "content": "你好",
        "additional_kwargs": {},
        "response_metadata": {}
    }
}));
console.log(de);