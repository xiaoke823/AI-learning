<script setup>
import { nextTick, onMounted, ref, watch } from 'vue';
import MarkDown from '../components/MarkDown.vue';
import { createConversation, getConversation, requestLLM } from '../api/index.js';
import { useRoute, useRouter } from 'vue-router';
import WmCard from '@/components/wmCard.vue';

const route = useRoute()
const router = useRouter();

const inputvalue = ref("")
const convertList = ref([]);
const isThinking = ref(false);
const test = ref("");
function sendToLLM(word) {

    isThinking.value = true;
    const _convertList = [...convertList.value];
    _convertList.push({
        role: "user",
        content: word
    })
    convertList.value = _convertList;

    requestLLM(word, '001', route.query.convertId, (event) => {

        const assistantObj = JSON.parse(event.data)

        //空字符有id-=>你-》找到同id的对象替换-》你好-》找到同id的对象替换
        const _convertList = [...convertList.value];
        const convertIndex = _convertList.findIndex(item => {
            if (item.id === assistantObj.id && assistantObj.id && item.id) {
                return true;
            }
        });
        if (convertIndex !== -1) {
            _convertList[convertIndex] = assistantObj
        } else {
            isThinking.value = false;
            _convertList.push(assistantObj)
        }
        convertList.value = _convertList;
    })
}
function getDetailById(convertId) {
    getConversation('001', convertId).then((res) => {
        convertList.value = res.data.data.list;
    })
}
function createNew() {
    createConversation('001').then((res) => {
        router.push("/?convertId=" + res.data.data)
    })
}
function wmCardConfirm(id) {
    requestLLM();
}
onMounted(() => {
    const { convertId } = route.query
    if (convertId) {
        getDetailById(convertId)
    } else {
        createConversation('001').then((res) => {
            router.push("/?convertId=" + res.data.data)
        })
    }


})
// onMounted(() => {
//     let eventClient = new EventSource("http://localhost:3000/ssetest");
//     eventClient.onmessage = event => {
//         const _data = JSON.parse(event.data);
//         if (_data.done) {
//             eventClient.close();
//         } else {
//             test.value += _data
//         }
//     }
// })
watch(route, () => {

    getDetailById(route.query.convertId)
})
</script>

<template>
    <div class="chat-wrapper">
        <div class="chat-content">
            {{ test }}
            <div v-for="chatItem in convertList" class="chat-item">
                <div v-if="chatItem.role === 'user' && chatItem.content !== ''" class="user-content">
                    <MarkDown :content="chatItem.content">
                    </MarkDown>
                </div>
                <div v-if="chatItem.role === 'assistant' && chatItem.content !== ''" class="assistant-content">
                    <MarkDown :content="chatItem.content">
                    </MarkDown>
                </div>
                <div v-if="chatItem.role === 'tool' && chatItem.cardName !== ''" class="assistant-content">
                    <WmCard @cardConfirm="sendToLLM" v-if="chatItem.cardName === 'wm_card'"
                        :kind="chatItem.arguments.kind" :cardData="chatItem.arguments.data"></WmCard>

                </div>
            </div>
            <div v-if="isThinking" class="chat-item">
                <div class="assistant-content">
                    思考中...
                </div>
            </div>
        </div>
        <div class="input-content">
            <input type="text" v-model="inputvalue" />
            <button @click="sendToLLM(inputvalue)">发送</button>
            <button @click="createNew">创建新对话</button>
        </div>
    </div>
</template>

<style scoped>
.chat-wrapper {
    width: 900px;

}

.chat-content {
    padding-top: 20px;
    width: 100%;
    height: 500px;
    border: 1px solid black;
    overflow: scroll;
}

.input-content {
    width: 100%;
    display: flex;
}

.input-content input {
    flex: 1
}

.chat-item {
    width: 100%;
    margin-bottom: 20px;
    display: flex;
    box-sizing: border-box;
    padding: 0 10px;
}

.user-content {
    border-radius: 12px;
    padding: 0 8px;
    background-color: rgb(29, 120, 188);
    margin-left: auto;
    max-width: 40%;
}

.assistant-content {
    border-radius: 12px;
    padding: 0 8px;
    border: 1px solid grey;
    margin-right: auto;
    max-width: 40%;
}
</style>
