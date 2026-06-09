<script setup>
// import axios from 'axios'
const {kind,cardData} = defineProps(['kind','cardData'])
// axios.get('wm-list?kind='+kind)
const emit = defineEmits(['cardConfirm'])
const dianta = (id)=>{
    emit('cardConfirm',`我要点id为${id}的煲仔饭`)
}
</script>
<template>
    <div>
        我是一个点外卖的卡片，你点的是{{ kind }}
    </div>
    <div v-for="item in cardData" :key="item.id">
        {{item.name}}---{{ item.price }}元
        <button @click="dianta(item.id)">点他</button>
    </div>
</template>