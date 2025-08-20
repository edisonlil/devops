import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue'),
    meta: { title: '仪表板' }
  },
  {
    path: '/workspace',
    name: 'WorkspaceList',
    component: () => import('../views/workspace/WorkspaceList.vue'),
    meta: { title: '工作空间列表' }
  },
  {
    path: '/workspace/create',
    name: 'WorkspaceCreate',
    component: () => import('../views/workspace/WorkspaceCreate.vue'),
    meta: { title: '创建工作空间' }
  },
  {
    path: '/workspace/:name',
    name: 'WorkspaceDetail',
    component: () => import('../views/workspace/WorkspaceDetail.vue'),
    meta: { title: '工作空间详情' }
  },
  {
    path: '/workspace/:name/config',
    name: 'WorkspaceConfig',
    component: () => import('../views/workspace/WorkspaceConfig.vue'),
    meta: { title: '配置编辑' }
  },
  {
    path: '/command',
    name: 'CommandGenerator',
    component: () => import('../views/CommandGenerator.vue'),
    meta: { title: '命令生成器' }
  },
  {
    path: '/deploy',
    name: 'DeployManagement',
    component: () => import('../views/DeployManagement.vue'),
    meta: { title: '部署管理' }
  },
  {
    path: '/tools',
    name: 'ToolsManagement',
    component: () => import('../views/ToolsManagement.vue'),
    meta: { title: '工具管理' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
