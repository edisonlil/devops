<template>
  <div class="workspace-layout">
    <!-- 工作空间头部 -->
    <div class="workspace-header">
      <div class="header-left">
        <n-button text @click="goBack">
          <template #icon>
            <n-icon><ArrowBack /></n-icon>
          </template>
          返回工作空间
        </n-button>
        <n-divider vertical />
        <span class="workspace-title">
          🏢 {{ currentWorkspaceInfo?.displayName || workspaceName }}
        </span>
      </div>
      
      <div class="header-right">
        <n-space>
          <n-tag type="info" size="small">
            {{ workspaceName }}
          </n-tag>
          <n-button size="small" @click="refreshData">
            <template #icon>
              <n-icon><Refresh /></n-icon>
            </template>
            刷新
          </n-button>
          <n-dropdown :options="userMenuOptions" @select="handleUserMenuSelect">
            <n-avatar size="small" :src="userAvatar" style="cursor: pointer" />
          </n-dropdown>
        </n-space>
      </div>
    </div>

    <!-- 工作空间内容区域 -->
    <div class="workspace-content">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { ArrowBack, Refresh } from '@vicons/ionicons5'
import { useWorkspaceStore } from '@/stores/workspace'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const workspaceStore = useWorkspaceStore()

const workspaceName = computed(() => route.params.workspaceName as string)
const currentWorkspaceInfo = computed(() => workspaceStore.currentWorkspaceInfo)
const userAvatar = '/default-avatar.png'

const userMenuOptions = [
  {
    label: '工作空间设置',
    key: 'workspace-settings'
  },
  {
    label: '用户设置',
    key: 'user-settings'
  },
  {
    type: 'divider'
  },
  {
    label: '退出登录',
    key: 'logout'
  }
]

const goBack = () => {
  router.push('/workspace')
}

const refreshData = () => {
  // 刷新当前页面数据
  message.info('数据刷新中...')
  // 这里可以触发子组件的数据刷新
}

const handleUserMenuSelect = (key: string) => {
  switch (key) {
    case 'workspace-settings':
      message.info('工作空间设置功能开发中...')
      break
    case 'user-settings':
      message.info('用户设置功能开发中...')
      break
    case 'logout':
      message.info('退出登录功能开发中...')
      break
  }
}

onMounted(() => {
  // 确保当前工作空间与路由参数一致
  if (workspaceName.value && workspaceName.value !== workspaceStore.currentWorkspace) {
    workspaceStore.switchWorkspace(workspaceName.value)
  }
})
</script>

<style scoped>
.workspace-layout {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.workspace-header {
  background: white;
  border-bottom: 1px solid #e0e0e0;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.workspace-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.header-right {
  display: flex;
  align-items: center;
}

.workspace-content {
  flex: 1;
  overflow: auto;
}

@media (max-width: 768px) {
  .workspace-header {
    padding: 8px 16px;
  }
  
  .workspace-title {
    font-size: 14px;
  }
  
  .header-left {
    gap: 8px;
  }
}
</style>
