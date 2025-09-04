<template>
  <div class="workspace-home">
    <!-- 使用通用导航栏 -->
    <GlobalNavbar />

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 页面标题区域 -->
      <div class="page-header">
        <div class="header-content">
          <h1 class="page-title text-h1">控制台</h1>
          <p class="page-subtitle text-subtitle">管理您的 DevOps 资源和服务</p>
        </div>
      </div>

      <!-- 功能卡片网格 -->
      <div class="function-grid">
        <FunctionCard
          v-for="func in functions"
          :key="func.id"
          :title="func.title"
          :description="func.description"
          :icon="func.icon"
          :enabled="func.enabled"
          :status="func.status"
          :stats="func.stats"
          @click="handleFunctionClick(func)"
        />
      </div>
    </div>



    <!-- 创建工作空间对话框 -->
    <n-modal v-model:show="showCreateDialog">
      <n-card title="创建工作空间" style="width: 500px">
        <n-form ref="createFormRef" :model="createForm" :rules="createRules">
          <n-form-item label="工作空间名称" path="name">
            <n-input v-model:value="createForm.name" placeholder="production" />
          </n-form-item>
          <n-form-item label="显示名称" path="displayName">
            <n-input v-model:value="createForm.displayName" placeholder="生产环境" />
          </n-form-item>
          <n-form-item label="描述" path="description">
            <n-input
              v-model:value="createForm.description"
              type="textarea"
              placeholder="工作空间描述..."
            />
          </n-form-item>
        </n-form>

        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <n-button @click="showCreateDialog = false">取消</n-button>
            <n-button type="primary" @click="createWorkspace" :loading="creating">创建</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import { useWorkspaceStore } from '@/stores/workspace'
import GlobalNavbar from '@/components/layout/GlobalNavbar.vue'
import FunctionCard from '@/components/common/FunctionCard.vue'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const workspaceStore = useWorkspaceStore()

const showCreateDialog = ref(false)
const creating = ref(false)

const createForm = ref({
  name: '',
  displayName: '',
  description: ''
})

const createRules = {
  name: { required: true, message: '请输入工作空间名称' },
  displayName: { required: true, message: '请输入显示名称' }
}


// 可用模块配置
const availableModules = computed(() => [
  {
    id: 'devbox',
    name: 'DevBox',
    description: '开发环境',
    icon: '🔧',
    route: 'devbox',
    enabled: false // 暂未实现
  },
  {
    id: 'app-store',
    name: '应用商店',
    description: '应用市场',
    icon: '📧',
    route: 'app-store',
    enabled: false // 暂未实现
  },
  {
    id: 'database',
    name: '数据库',
    description: '数据库服务',
    icon: '🗄️',
    route: 'database',
    enabled: false // 暂未实现
  },
  {
    id: 'application',
    name: '应用管理',
    description: '应用部署管理',
    icon: '🐙',
    route: 'application',
    enabled: false // 暂未实现
  },
  {
    id: 'middleware',
    name: '中间件管理',
    description: '中间件部署',
    icon: '🚀',
    route: 'middleware',
    enabled: true // 已实现
  },
  {
    id: 'monitoring',
    name: '监控面板',
    description: '系统监控',
    icon: '📊',
    route: 'monitoring',
    enabled: false // 暂未实现
  },
  {
    id: 'template',
    name: '全局模板管理',
    description: '模板管理',
    icon: '🔧',
    route: 'template',
    enabled: true // 已实现
  },
  {
    id: 'logs',
    name: '日志管理',
    description: '日志查看',
    icon: '📝',
    route: 'logs',
    enabled: false // 暂未实现
  },
  {
    id: 'storage',
    name: '存储管理',
    description: '存储卷管理',
    icon: '💾',
    route: 'storage',
    enabled: false // 暂未实现
  },
  {
    id: 'permissions',
    name: '权限管理',
    description: '用户权限',
    icon: '🔐',
    route: 'permissions',
    enabled: false // 暂未实现
  }
])

// 功能模块配置
const functions = ref([
  {
    id: 'middleware',
    title: '中间件管理',
    description: '管理数据库、缓存、消息队列等中间件服务',
    icon: 'middleware',
    enabled: true,
    status: { type: 'success', text: '运行中' },
    stats: [
      { label: '实例', value: 5 },
      { label: '运行中', value: 4 }
    ]
  },
  {
    id: 'application',
    title: '应用管理',
    description: '部署和管理容器化应用程序',
    icon: 'application',
    enabled: true,
    status: { type: 'info', text: '开发中' },
    stats: [
      { label: '应用', value: 12 },
      { label: '运行中', value: 8 }
    ]
  },
  {
    id: 'database',
    title: '数据库',
    description: 'MySQL、PostgreSQL、MongoDB 等数据库服务',
    icon: 'database',
    enabled: true,
    status: { type: 'success', text: '正常' },
    stats: [
      { label: '实例', value: 3 },
      { label: '连接数', value: 45 }
    ]
  },
  {
    id: 'monitoring',
    title: '监控告警',
    description: '系统监控、性能分析和告警通知',
    icon: 'monitoring',
    enabled: false,
    status: { type: 'warning', text: '即将上线' }
  },
  {
    id: 'cicd',
    title: 'CI/CD',
    description: '持续集成和持续部署流水线',
    icon: 'cicd',
    enabled: true,
    status: { type: 'success', text: '可用' },
    stats: [
      { label: '流水线', value: 0 },
      { label: '部署次数', value: 0 }
    ]
  },
  {
    id: 'storage',
    title: '存储管理',
    description: '对象存储、文件系统和数据备份',
    icon: 'storage',
    enabled: false,
    status: { type: 'info', text: '规划中' }
  },
  {
    id: 'network',
    title: '网络服务',
    description: '负载均衡、域名解析和网络安全',
    icon: 'network',
    enabled: false,
    status: { type: 'info', text: '规划中' }
  },
  {
    id: 'security',
    title: '安全管理',
    description: '访问控制、证书管理和安全审计',
    icon: 'security',
    enabled: false,
    status: { type: 'info', text: '规划中' }
  }
])


const handleModuleClick = (module: any) => {
  if (!module.enabled) {
    message.warning(`${module.name} 功能暂未实现，敬请期待`)
    return
  }
  
  if (!currentWorkspace.value) {
    message.error('请先选择工作空间')
    return
  }
  
  router.push(`/workspace/${currentWorkspace.value}/${module.route}`)
}

const createWorkspace = async () => {
  creating.value = true
  try {
    await workspaceStore.createWorkspace(createForm.value)
    showCreateDialog.value = false
    createForm.value = { name: '', displayName: '', description: '' }
    message.success('工作空间创建成功')
  } catch (error: any) {
    message.error(error.message || '创建工作空间失败')
  } finally {
    creating.value = false
  }
}


// 功能卡片点击处理
const handleFunctionClick = (func: any) => {
  if (!func.enabled) {
    message.warning(`${func.title} 功能暂未实现，敬请期待`)
    return
  }

  // 从路由参数获取当前工作空间名称
  const currentWorkspaceName = route.params.workspaceName as string
  
  if (!currentWorkspaceName) {
    message.error('无法获取工作空间信息')
    return
  }
  
  // 根据功能类型进行路由跳转
  switch (func.id) {
    case 'middleware':
      router.push(`/workspace/${currentWorkspaceName}/manage/middleware`)
      break
    case 'application':
      router.push(`/workspace/${currentWorkspaceName}/manage/application`)
      break
    case 'database':
      // 跳转到中间件管理页面，数据库属于中间件的一部分
      router.push(`/workspace/${currentWorkspaceName}/manage/middleware`)
      break
    case 'cicd':
      router.push(`/workspace/${currentWorkspaceName}/manage/cicd`)
      break
    default:
      message.info(`${func.title} 功能开发中...`)
  }
}



</script>

<style scoped>
.workspace-home {
  min-height: 100vh;
  background: #ffffff;
}


.main-content {
  flex: 1;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.page-header {
  margin-bottom: 32px;
  padding: 0 4px;
}

.header-content h1.page-title {
  margin: 0 0 8px 0;
}

.header-content .page-subtitle {
  margin: 0;
}

.function-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 0 4px;
}


.notification-banner {
  margin: 12px 20px;
  background: #f6ffed;
  border: 1px solid #b7eb8f;
  border-radius: 4px;
  padding: 8px 12px;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #52c41a;
}

.app-grid-container {
  padding: 40px 20px;
  display: flex;
  justify-content: center;
  min-height: calc(100vh - 120px);
  align-items: center;
}

@media (max-width: 768px) {
  .main-content {
    padding: 16px;
  }

  .page-header {
    margin-bottom: 24px;
  }

  .function-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 16px;
  }
}

@media (max-width: 480px) {
  .main-content {
    padding: 12px;
  }

  .function-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}
</style>
