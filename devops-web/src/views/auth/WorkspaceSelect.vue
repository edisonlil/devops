<template>
  <div class="workspace-select-page">
    <div class="select-container">
      <div class="select-card">
        <div class="header">
          <h1 class="title">选择工作空间</h1>
          <p class="subtitle">请选择一个工作空间作为默认工作空间</p>
        </div>

        <div class="workspace-list">
          <n-spin :show="loading">
            <div v-if="workspaces.length > 0" class="workspace-options">
              <div
                v-for="workspace in workspaces"
                :key="workspace"
                class="workspace-option"
                :class="{ active: selectedWorkspace === workspace }"
                @click="selectedWorkspace = workspace"
              >
                <div class="workspace-info">
                  <div class="workspace-name">{{ workspace }}</div>
                  <div class="workspace-path">workspace/{{ workspace }}</div>
                </div>
                <div class="workspace-radio">
                  <n-radio
                    :checked="selectedWorkspace === workspace"
                    @click.stop="selectedWorkspace = workspace"
                  />
                </div>
              </div>
            </div>
            
            <div v-else-if="!loading" class="no-workspaces">
              <n-empty description="未找到可用的工作空间" />
            </div>
          </n-spin>
        </div>

        <div class="actions">
          <n-button
            type="primary"
            size="large"
            block
            :disabled="!selectedWorkspace"
            :loading="creating"
            @click="handleConfirm"
          >
            {{ creating ? '设置中...' : '确认并进入' }}
          </n-button>
          
          <n-button
            text
            size="large"
            block
            class="logout-btn"
            @click="handleLogout"
          >
            重新登录
          </n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { getRemoteWorkspaces, createEnableFile, getWorkspaceEnable } from '@/api/workspace'
import { logout } from '@/api/auth'

const router = useRouter()
const message = useMessage()

const loading = ref(false)
const creating = ref(false)
const workspaces = ref<string[]>([])
const selectedWorkspace = ref('')

const loadWorkspaces = async () => {
  try {
    loading.value = true

    // 先检查是否已存在enable文件
    try {
      const enableResponse = await getWorkspaceEnable()
      if (enableResponse.data.exists && enableResponse.data.workspace) {
        // 如果已经有默认工作空间配置，直接跳转
        console.log('已存在默认工作空间:', enableResponse.data.workspace)
        router.replace(`/workspace/${enableResponse.data.workspace}`)
        return
      }
    } catch (error: any) {
      console.log('检查enable文件失败:', error)
      // 如果是认证错误，跳转到登录页
      if (error.response?.status === 401) {
        console.log('用户未登录，跳转到登录页')
        message.error('会话已过期，请重新登录')
        router.replace('/login')
        return
      }
    }

    // 如果没有enable文件，获取工作空间列表供用户选择
    const response = await getRemoteWorkspaces()
    workspaces.value = response.data.workspaces

    // 如果只有一个工作空间，自动选中
    if (workspaces.value.length === 1) {
      selectedWorkspace.value = workspaces.value[0]
    }
  } catch (error: any) {
    console.error('获取工作空间列表失败:', error)

    // 如果是认证错误，跳转到登录页
    if (error.response?.status === 401) {
      console.log('用户未登录，跳转到登录页')
      message.error('请先进行SSH登录')
      router.replace('/login')
      return
    }

    message.error('获取工作空间列表失败: ' + (error.response?.data?.message || error.message))
  } finally {
    loading.value = false
  }
}

const handleConfirm = async () => {
  if (!selectedWorkspace.value) {
    message.warning('请选择一个工作空间')
    return
  }

  try {
    creating.value = true
    
    // 创建enable文件
    await createEnableFile({ workspace: selectedWorkspace.value })
    
    message.success(`已设置 ${selectedWorkspace.value} 为默认工作空间`)
    
    // 跳转到工作空间
    router.replace(`/workspace/${selectedWorkspace.value}`)
  } catch (error: any) {
    console.error('设置默认工作空间失败:', error)
    message.error('设置默认工作空间失败')
  } finally {
    creating.value = false
  }
}

const handleLogout = async () => {
  try {
    await logout()
    localStorage.removeItem('ssh_session')
    router.replace('/login')
  } catch (error) {
    // 即使登出失败，也清除本地会话
    localStorage.removeItem('ssh_session')
    router.replace('/login')
  }
}

onMounted(() => {
  loadWorkspaces()
})
</script>

<style scoped>
.workspace-select-page {
  min-height: 100vh;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', sans-serif;
}

.select-container {
  width: 100%;
  max-width: 500px;
}

.select-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  padding: 32px;
  border: 1px solid #e8e8e8;
}

.header {
  text-align: center;
  margin-bottom: 32px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 8px 0;
  line-height: 1.2;
}

.subtitle {
  font-size: 15px;
  color: #86868b;
  margin: 0;
  line-height: 1.4;
}

.workspace-list {
  margin-bottom: 24px;
  min-height: 200px;
}

.workspace-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.workspace-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #ffffff;
}

.workspace-option:hover {
  border-color: #007AFF;
  background: #f8f9fa;
}

.workspace-option.active {
  border-color: #007AFF;
  background: #f0f8ff;
}

.workspace-info {
  flex: 1;
}

.workspace-name {
  font-size: 16px;
  font-weight: 500;
  color: #262626;
  margin-bottom: 4px;
}

.workspace-path {
  font-size: 13px;
  color: #86868b;
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
}

.workspace-radio {
  margin-left: 12px;
}

.no-workspaces {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 200px;
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.actions :deep(.n-button) {
  border-radius: 8px;
  font-weight: 500;
  height: 44px;
}

.logout-btn {
  color: #86868b !important;
}

.logout-btn:hover {
  color: #262626 !important;
  background: #f5f5f5 !important;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .select-card {
    padding: 24px;
  }

  .title {
    font-size: 20px;
  }

  .workspace-option {
    padding: 12px;
  }

  .workspace-name {
    font-size: 15px;
  }

  .workspace-path {
    font-size: 12px;
  }
}
</style>