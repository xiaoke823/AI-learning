<script setup>
import { VueMarkdown } from "@crazydos/vue-markdown"
import remarkGfm from "remark-gfm"
import hidhlightPlugins from "rehype-highlight"

const { content } = defineProps(["content"])

</script>
<template>
    <VueMarkdown :custom-attrs="{
        a: { class: 'mardown-a' }
    }" :remark-plugins="[remarkGfm]" :rehype-plugins="[hidhlightPlugins]" :markdown="content">
        <template #input="{ ...props }">
            <span v-if="props.type === 'checkbox' && props.checked">
                ✅
            </span>
            <span v-if="props.type === 'checkbox' && !props.checked">
                [ ]
            </span>
        </template>
        <template #li="{ children, ...props }">
            <div class="my-li">
                <Component :is="children"></Component>
            </div>
        </template>
    </VueMarkdown>
</template>