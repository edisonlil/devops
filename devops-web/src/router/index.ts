import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/auth/Login.vue'),
    meta: { 
      title: '登录',
      requiresGuest: true 
    }
  },
  {
    path: '/workspace-select',
    name: 'WorkspaceSelect',
    component: () => import('@/views/auth/WorkspaceSelect.vue'),
    meta: { 
      title: '选择工作空间',
      requiresAuth: true 
    }
  },
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/workspace/:workspaceName',
    name: 'WorkspaceHome',
    component: () => import('@/views/workspace/WorkspaceHome.vue'),
    meta: { requiresAuth: true, title: '控制台' }
  },
  {
    path: '/workspace/:workspaceName/manage',
    component: () => import('@/views/workspace/WorkspaceLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'middleware',
        name: 'MiddlewareManager',
        component: () => import('@/views/middleware/MiddlewareManagerClean.vue'),
        meta: { title: '中间件管理' },
        children: [
          {
            path: 'deploy/:templateName?',
            name: 'MiddlewareDeploy',
            component: () => import('@/views/middleware/TemplateSelector.vue'),
            meta: { title: '部署中间件' }
          },
          {
            path: 'config/:templateName/:instanceName?',
            name: 'MiddlewareConfig',
            component: () => import('@/views/middleware/ParameterConfig.vue'),
            meta: { title: '配置参数' }
          },
          {
            path: 'preview/:templateName/:instanceName',
            name: 'MiddlewarePreview',
            component: () => import('@/views/middleware/DeployPreview.vue'),
            meta: { title: '部署预览' }
          },
          {
            path: 'progress/:deploymentId',
            name: 'MiddlewareProgress',
            component: () => import('@/views/middleware/DeployProgress.vue'),
            meta: { title: '部署进度' }
          }
        ]
      },
      {
        path: 'application',
        name: 'ApplicationManager',
        component: () => import('@/views/application/ApplicationManager.vue'),
        meta: { title: '应用管理' }
      },
      {
        path: 'application/deploy',
        name: 'TemplateSelection',
        component: () => import('@/views/deploy/TemplateSelection.vue'),
        meta: { title: '选择部署模板' }
      },
      {
        path: 'application/deploy/config',
        name: 'DeployConfig',
        component: () => import('@/views/deploy/DeployConfig.vue'),
        meta: { title: '配置部署' }
      },
      {
        path: 'template',
        name: 'GlobalTemplateManager',
        component: () => import('@/views/template/GlobalTemplateManager.vue'),
        meta: { 
          title: '全局模板管理',
          requiresPermission: 'admin' 
        }
      },

      {
        path: 'deploy/remote',
        name: 'RemoteDeployManager',
        component: () => import('@/views/deploy/RemoteDeployManager.vue'),
        meta: { title: '远程部署管理' }
      },
      {
        path: 'deploy/application',
        name: 'ApplicationDeploy',
        component: () => import('@/views/deploy/ApplicationDeploy.vue'),
        meta: { title: '应用部署' }
      },
      {
        path: 'cicd',
        name: 'CICDManager',
        component: () => import('@/views/cicd/PipelineManager.vue'),
        meta: { title: 'CI/CD 流水线管理' }
      },
      {
        path: 'cicd/execution/:pipelineId',
        name: 'PipelineExecution',
        component: () => import('@/views/cicd/PipelineExecution.vue'),
        meta: { title: '流水线执行' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// SSH会话检查函数
const checkSSHSession = (): boolean => {
  const session = localStorage.getItem('ssh_session')
  if (!session) return false
  
  try {
    const sessionData = JSON.parse(session)
    return sessionData.connected && sessionData.timestamp
  } catch {
    return false
  }
}

// 获取默认工作空间
const getDefaultWorkspaceFromSession = (): string | null => {
  const session = localStorage.getItem('ssh_session')
  if (!session) return null
  
  try {
    const sessionData = JSON.parse(session)
    return sessionData.defaultWorkspace || null
  } catch {
    return null
  }
}

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - DevOps Platform`
  }
  
  const isAuthenticated = checkSSHSession()
  
  // 检查认证
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
    return
  }
  
  // 检查游客访问（已登录用户不能访问登录页）
  if (to.meta.requiresGuest && isAuthenticated) {
    const defaultWorkspace = getDefaultWorkspaceFromSession()
    if (defaultWorkspace) {
      next(`/workspace/${defaultWorkspace}`)
    } else {
      next('/workspace-select')
    }
    return
  }
  
  next()
})

export default router
