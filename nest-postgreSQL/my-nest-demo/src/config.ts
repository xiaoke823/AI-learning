export const config = {
    ollama: {
        // 这里的host是 ollama 的服务地址，需要根据实际情况进行
        host: 'http://localhost:11434',
        // 这里的chatModel是 ollama 的模型名称，需要根据实际情况进行
        chatModel: 'qwen3.5:0.8b',
        // 这里的promptTemplate是 ollama 的提示模板，需要根据实际情况进行
        embedModel: 'mxbai-embed-large:latest',
        temperature: 0.3
    }
}