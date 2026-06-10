<script setup>
import axios from 'axios';

const { kind, cardData } = defineProps(['kind', 'cardData'])
const emit = defineEmits(["cardConfirm"])
function dianta(id) {
    emit("cardConfirm", `我要点id为${id}的煲仔饭`)
}
//axios请求业务接口获取到有哪些外卖然后展示
// axios.get("/wm-list?king="+kind)
</script>
<template>
    <div>
        我是一个点外卖的卡片，你的点的是{{ kind }}
    </div>
    <div v-for="item in cardData">
        {{ item.name }}
        {{ item.price }}
        <button @click="dianta(item.id)">点他</button>
    </div>
</template>