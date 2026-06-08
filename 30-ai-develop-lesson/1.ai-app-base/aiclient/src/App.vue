<script setup>
import { RouterView, useRouter } from "vue-router"
import { listConversation } from "./api"
import { onMounted, ref } from "vue";
//假设已经登录，你的id是001
const historyList = ref([]);
const router = useRouter();
onMounted(() => {
  listConversation('001').then((res) => {
    historyList.value = res.data.data
  })
})
function gotoHistory(convertId) {
  router.push("/?convertId=" + convertId)
}
</script>

<template>
  <div class="layout">
    <div class="slidebar">
      <div v-for="item in historyList" :key="item.convertId" @click="gotoHistory(item.convertId)">
        {{ item.title }}
      </div>
    </div>
    <RouterView></RouterView>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  width: 1200px;
  margin: 0 auto;
}

.slidebar {
  width: 280px;
  border: 1px solid black;
}
</style>
