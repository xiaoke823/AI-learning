<script setup>
import { nextTick, ref } from 'vue';
import MarkDown from './components/MarkDown.vue';
import { requestLLM } from './api';

const inputvalue = ref("")
const convertList = ref([

]);
const isThinking = ref(false);
const chatContent = ref(null);

function scrollToBottom() {
  nextTick(() => {
    chatContent.value.scrollTop = chatContent.value.scrollHeight;
  });
}

function sendToLLM() {
  if (!inputvalue.value.trim()) return;
  convertList.value.push({
    role:'user',
    content:inputvalue.value
  })
  nextTick(()=>{
    isThinking.value = true
  })
  scrollToBottom();
  
  requestLLM(inputvalue.value).then(res=>{
    convertList.value.push(res.data.message)
    isThinking.value = false
    inputvalue.value = ''
    scrollToBottom();
  }).catch(()=>{
    isThinking.value = false
  })

}
</script>

<template>
  <div class="chat-wrapper">
    <div class="chat-content" ref="chatContent">
      <div v-for="chatItem in convertList" class="chat-item">
        <div v-if="chatItem.role === 'user'" class="user-content">
          <MarkDown :content="chatItem.content">
          </MarkDown>
        </div>
        <div v-if="chatItem.role === 'assistant'" class="assistant-content">
          <MarkDown :content="chatItem.content">
          </MarkDown>
        </div>
      </div>
      <div v-if="isThinking" class="chat-item">
        <div class="assistant-content">
          思考中...
        </div>
      </div>
    </div>
    <div class="input-content">
      <input type="text" v-model="inputvalue" @keydown.enter="sendToLLM"/>
      <button @click="sendToLLM">发送</button>
    </div>
  </div>
</template>

<style scoped>
.chat-wrapper {
  width: 600px;
  margin: 0 auto;
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
