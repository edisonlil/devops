import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'WorkspaceList',
    component: () => import('../views/WorkspaceList.vue'),
    meta: { title: 'DevOps 工作台' }
  },
  {
    path: '/workspace/create',
    name: 'WorkspaceCreate',
    component: () => import('../views/WorkspaceCreate.vue'),
    meta: { title: '新建工作空间' }
  },
  {
    path: '/workspace/:id',
    name: 'WorkspaceDetail',
    component: () => import('../views/WorkspaceDetail.vue'),
    meta: { title: '工作空间详情' }
  },
  {
    path: '/workspace/:id/edit',
    name: 'WorkspaceEdit',
    component: () => import('../views/WorkspaceEdit.vue'),
    meta: { title: '编辑工作空间' }
  },
  {
    path: '/workspace/:id/workbench',
    name: 'Workbench',
    component: () => import('../views/Workbench.vue'),
    meta: { title: '工作台' }
  },
  {
    path: '/workspace/:id/job/create',
    name: 'JobCreate',
    component: () => import('../views/JobCreate.vue'),
    meta: { title: '新建作业' }
  },
  {
    path: '/workspace/:id/job/:jobId',
    name: 'JobDetail',
    component: () => import('../views/JobDetail.vue'),
    meta: { title: '作业详情' }
  },
  {
    path: '/workspace/:id/job/:jobId/edit',
    name: 'JobEdit',
    component: () => import('../views/JobEdit.vue'),
    meta: { title: '编辑作业' }
  },
  {
    path: '/templates',
    name: 'TemplateManagement',
    component: () => import('../views/TemplateManagement.vue'),
    meta: { title: '模板管理' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
