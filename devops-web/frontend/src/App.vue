<template>
  <el-container class="app-container">
    <!-- 侧边栏 -->
    <el-aside width="250px" class="sidebar">
      <div class="logo">
        <h2>DevOps Web</h2>
      </div>
      <el-menu
        :default-active="$route.path"
        router
        class="sidebar-menu"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/">
          <el-icon><Monitor /></el-icon>
          <span>仪表板</span>
        </el-menu-item>
        
        <el-sub-menu index="workspace">
          <template #title>
            <el-icon><Folder /></el-icon>
            <span>工作空间</span>
          </template>
          <el-menu-item index="/workspace">
            <el-icon><List /></el-icon>
            <span>工作空间列表</span>
          </el-menu-item>
          <el-menu-item index="/workspace/create">
            <el-icon><Plus /></el-icon>
            <span>创建工作空间</span>
          </el-menu-item>
        </el-sub-menu>
        
        <el-menu-item index="/command">
          <el-icon><Terminal /></el-icon>
          <span>命令生成器</span>
        </el-menu-item>
        
        <el-menu-item index="/deploy">
          <el-icon><Upload /></el-icon>
          <span>部署管理</span>
        </el-menu-item>
        
        <el-menu-item index="/tools">
          <el-icon><Tools /></el-icon>
          <span>工具管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <!-- 顶部导航 -->
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="$route.meta.title">{{ $route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown>
            <span class="user-info">
              <el-icon><User /></el-icon>
              DevOps用户
              <el-icon class="el-icon--right"><arrow-down /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="showSystemInfo">系统信息</el-dropdown-item>
                <el-dropdown-item divided>退出</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 主内容 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>

  <!-- 系统信息对话框 -->
  <el-dialog v-model="systemInfoVisible" title="系统信息" width="600px">
    <el-descriptions :column="2" border>
      <el-descriptions-item label="DevOps版本">{{ systemInfo.version }}</el-descriptions-item>
      <el-descriptions-item label="Node.js版本">{{ systemInfo.nodeVersion }}</el-descriptions-item>
      <el-descriptions-item label="平台">{{ systemInfo.platform }}</el-descriptions-item>
      <el-descriptions-item label="DevOps路径">{{ systemInfo.devopsPath }}</el-descriptions-item>
      <el-descriptions-item label="工作空间路径" :span="2">{{ systemInfo.workspacePath }}</el-descriptions-item>
    </el-descriptions>
  </el-dialog>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from './api/index.js'

const router = useRouter()
const systemInfoVisible = ref(false)
const systemInfo = ref({})

const showSystemInfo = async () => {
  try {
    const response = await api.get('/system/info')
    systemInfo.value = response.data
    systemInfoVisible.value = true
  } catch (error) {
    console.error('获取系统信息失败:', error)
  }
}

onMounted(() => {
  // 初始化应用
})
</script>

<style scoped>
.app-container {
  height: 100vh;
}

.sidebar {
  background-color: #304156;
  overflow: hidden;
}

.logo {
  padding: 20px;
  text-align: center;
  color: #fff;
  border-bottom: 1px solid #434a50;
}

.logo h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.sidebar-menu {
  border: none;
}

.header {
  background-color: #fff;
  border-bottom: 1px solid #e6e6e6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.header-left {
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #606266;
}

.user-info .el-icon {
  margin: 0 5px;
}

.main-content {
  background-color: #f5f5f5;
  padding: 20px;
}
</style>

<style>
body {
  margin: 0;
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
}

* {
  box-sizing: border-box;
}
</style>
