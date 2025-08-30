import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/workspace'
  },
  {
    path: '/workspace',
    name: 'WorkspaceHome',
    component: () => import('@/views/workspace/WorkspaceHome.vue'),
    meta: { 
      title: '工作空间',
      requiresAuth: true 
    }
  },
  {
    path: '/workspace/:workspaceName',
    component: () => import('@/views/workspace/WorkspaceLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: to => `/workspace/${to.params.workspaceName}/dashboard`
      },
      {
        path: 'dashboard',
        name: 'WorkspaceDashboard',
        component: () => import('@/views/workspace/WorkspaceDashboard.vue'),
        meta: { title: '工作空间概览' }
      },
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
        path: 'template',
        name: 'GlobalTemplateManager',
        component: () => import('@/views/template/GlobalTemplateManager.vue'),
        meta: { 
          title: '全局模板管理',
          requiresPermission: 'admin' 
        }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - DevOps Platform`
  }
  
  // 这里可以添加认证逻辑
  // if (to.meta.requiresAuth && !isAuthenticated()) {
  //   next('/login')
  //   return
  // }
  
  next()
})

export default router
