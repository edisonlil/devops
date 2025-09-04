<template>
  <div class="professional-logo" @click="goToConsole">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#1890ff"/>
      <path d="M7 12L10 15L17 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="18" cy="6" r="2" fill="#52c41a"/>
    </svg>
    <span class="logo-text">DevOps Cloud</span>
  </div>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 点击logo跳转到控制台
const goToConsole = () => {
  // 获取当前工作空间名称
  const workspaceName = route.params.workspaceName as string || 'default'

  // 跳转到工作空间主页（控制台）
  router.push({
    name: 'WorkspaceHome',
    params: { workspaceName }
  })
}
</script>

<style scoped>
.professional-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
  user-select: none;
}

.professional-logo:hover {
  background-color: #f5f5f5;
  transform: translateY(-1px);
}

.professional-logo:active {
  transform: translateY(0);
  background-color: #e8e8e8;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  letter-spacing: -0.02em;
  transition: color 0.2s ease;
}

.professional-logo:hover .logo-text {
  color: #1890ff;
}

@media (max-width: 768px) {
  .professional-logo svg {
    width: 20px;
    height: 20px;
  }

  .logo-text {
    font-size: 15px;
  }
}
</style>
