import OpenAI from "openai";
const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
    const [url, opts] = args;
    if (opts.method === 'POST') {
        console.log('>>> REQUEST URL :', url);
        console.log('>>> REQUEST URL :', opts.method);
        console.log('>>> REQUEST HEADERS:', opts.headers);
        console.log('>>> REQUEST BODY  :', opts.body);


        // console.log('<<< RESPONSE Header   :', await clone.headers.get('content-type'));
    }
    const res = await originalFetch(...args);
    const clone = res.clone();
    if (opts.method === 'POST') {
        console.log('<<< RESPONSE STATUS :', clone.status, clone.statusText);
        console.log('<<< RESPONSE BODY   :', await clone.text());
    }

    return res;
};

const openai = new OpenAI({
    baseURL: "https://dashscope.aliyuncs.com/api/v1",
    apiKey: "sk-7d8dee72a49f49729567c1b08b4660b7"
})
await openai.request({
    method: "post",
    path: "/services/aigc/multimodal-generation/generation",
    body: {
        "model": "qwen-image-2.0",
        "input": {
            "messages": [
                {
                    "role": "user",
                    "content": [
                        {
                            "text": "给画我一刀盾狗在吃披萨"
                        }
                    ]
                }
            ]
        }
    }
})