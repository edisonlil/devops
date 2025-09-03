<template>
  <div class="workspace-layout">
    <!-- 使用通用导航栏 -->
    <GlobalNavbar />

    <!-- 工作空间内容区域 -->
    <div class="workspace-content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import GlobalNavbar from '@/components/layout/GlobalNavbar.vue'
</script>

<style scoped>
.workspace-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #ffffff;
}

.workspace-content {
  flex: 1;
  overflow: auto;
  background: #ffffff;
}
</style>
