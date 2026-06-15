---
name: vue-rules
description: 当用户生成任何和vue有关的代码的时候，先参考此skill的规则
---


# Vue 代码规则

## 适用场景

当任务涉及以下任意 Vue 相关内容时，使用此 skill：

* 创建 Vue 组件
* 修改已有 Vue 代码
* 重构 Vue 组件
* 调试 Vue 逻辑
* 审查 Vue 代码质量
* 编写 Vue Router 路由逻辑
* 编写 Pinia 或 Vuex 状态管理代码
* 编写 Composition API 或 Options API 代码
* 编写 `.vue` 单文件组件
* 编写 Vue + TypeScript 代码
* 使用 Element Plus、Ant Design Vue 等 Vue UI 组件库

在生成任何 Vue 相关代码之前，必须先阅读并遵守本规则。

## 通用原则

* 默认使用 Vue 3，除非用户明确要求 Vue 2。
* 默认使用 Composition API，除非已有项目明显使用 Options API。
* 新 Vue 3 组件默认使用 `<script setup>`。
* 如果项目已有 TypeScript，或用户要求生产级代码，优先使用 TypeScript。
* 组件职责要清晰，避免把不相关逻辑塞进同一个组件。
* 避免过度设计，优先使用能满足需求的最简单方案。
* 修改已有代码时，优先保持项目原有风格。
* 不要为了展示能力引入不必要的库、抽象或架构。

## Vue 3 组件结构

新建 Vue 3 组件时，优先使用以下结构：

```vue
<template>
  <div class="component-name">
    <!-- 内容 -->
  </div>
</template>

<script setup lang="ts">
// imports
// props / emits
// state
// computed
// methods
// lifecycle
</script>

<style scoped>
.component-name {
  /* 样式 */
}
</style>
```

## Props 规则

* 使用 `defineProps` 配合 TypeScript 类型。
* 避免使用过宽的类型，例如 `any`。
* prop 命名要清晰，能表达业务含义。
* 不要直接修改 props。
* 如果需要在组件内部编辑 prop 值，应创建本地状态副本。

示例：

```ts
interface Props {
  title: string
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
})
```

## Emits 规则

* 使用 `defineEmits` 显式声明事件类型。
* 事件名要清晰，例如 `update:modelValue`、`submit`、`cancel`、`change`。
* 避免使用含义模糊的事件名，例如 `ok`、`do`、`handle`。

示例：

```ts
const emit = defineEmits<{
  submit: [value: string]
  cancel: []
}>()
```

## 状态管理规则

* 基础类型优先使用 `ref`。
* 结构化对象可使用 `reactive`。
* 避免不必要的深层响应式对象。
* 派生状态优先使用 `computed`。
* 不要重复维护可以从已有数据推导出来的状态。

## Watch 规则

* 能用 `computed` 解决的，不要使用 `watch`。
* `watch` 主要用于副作用、异步请求、同步外部状态。
* 避免不必要的 `deep watch`。
* 涉及异步请求、定时器、事件监听等副作用时，要考虑清理逻辑。

## 生命周期规则

* 只在确实需要时使用生命周期钩子。
* 依赖 DOM 或浏览器运行环境的初始化逻辑，可以放在 `onMounted`。
* 定时器、订阅、事件监听、Observer 等资源必须在 `onUnmounted` 中清理。

## Template 规则

* 模板中保持逻辑简单。
* 避免在模板里写复杂表达式。
* 复杂判断、格式化、过滤、映射逻辑应放到 `computed` 或函数中。
* `v-for` 必须提供稳定且唯一的 `key`。
* 避免同时在同一个元素上使用复杂的 `v-if` 和 `v-for`。
* 表单绑定要注意数据类型，例如数字输入使用 `.number`。

## 样式规则

* 默认使用 `<style scoped>`。
* class 命名应清晰，避免过度简写。
* 不要随意使用全局样式。
* 修改 UI 库样式时，优先使用官方提供的变量、class、插槽或配置。
* 避免滥用 `!important`。

## TypeScript 规则

* 避免使用 `any`，除非确实无法推断或第三方类型缺失。
* 优先定义明确的接口或类型。
* API 返回值、组件 props、emits、表单数据应尽量有类型。
* 不要为了类型而制造过度复杂的泛型。
* 复杂类型应抽离成单独的 `types.ts` 或局部 interface。

## 请求和副作用规则

* 异步请求要处理 loading、error 和空数据状态。
* 避免在多个地方重复写相同请求逻辑。
* 页面卸载时要避免已失效请求继续修改状态。
* 不要在组件中直接写大量业务请求逻辑，复杂逻辑应抽离到 composable 或 service 中。

## Pinia 规则

* Vue 3 项目优先使用 Pinia，而不是 Vuex。
* store 中只放跨组件共享状态。
* 组件内部私有状态不要放进 store。
* action 负责处理异步逻辑和状态更新。
* getter 负责派生状态。
* store 命名要能表达业务领域。

## Vue Router 规则

* 路由跳转优先使用命名路由。
* 路由参数和 query 要明确类型和含义。
* 不要在组件中硬编码大量路径字符串。
* 权限、登录态、页面标题等全局逻辑优先放在路由守卫中。
* 页面组件中只处理和当前页面强相关的路由逻辑。

## 代码输出规则

当输出 Vue 代码时：

* 优先给出完整可运行的代码片段。
* 如果只修改部分代码，要明确指出修改位置。
* 不要省略关键逻辑。
* 不要输出伪代码，除非用户明确要求方案设计。
* 如果需要假设接口或数据结构，先在代码中清晰定义。
* 如果用户提供了已有代码，优先基于原代码最小改动。
* 如果有明显风险或边界情况，要在代码后简要说明。

## 代码审查规则

审查 Vue 代码时，优先检查：

* 响应式使用是否正确
* props 是否被直接修改
* emits 是否清晰
* `watch` 是否滥用
* 生命周期资源是否清理
* `v-for` key 是否稳定
* 异步请求是否处理 loading、error、空状态
* 组件职责是否过大
* TypeScript 类型是否过宽
* 是否符合 Vue 3 推荐写法

## 输出风格

* 回答要直接、具体。
* 优先给可执行代码和明确修改建议。
* 不要长篇解释基础概念，除非用户要求。
* 如果有多个实现方案，优先推荐最适合当前场景的一个。
* 如果用户的问题信息不足，先基于合理假设给出可用方案，并说明假设。
