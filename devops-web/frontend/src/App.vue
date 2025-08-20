<template>
  <div class="app-container">
    <!-- 顶部导航栏 -->
    <header class="app-header">
      <div class="header-content">
        <div class="header-left">
          <div class="logo">
            <el-icon class="logo-icon"><Box /></el-icon>
            <span class="logo-text">DevOps</span>
          </div>
          <div class="breadcrumb" v-if="showBreadcrumb">
            <el-button
              text
              class="breadcrumb-back"
              @click="goBack"
            >
              <el-icon><ArrowLeft /></el-icon>
              {{ breadcrumbText }}
            </el-button>
          </div>
        </div>
        <div class="header-right">
          <el-input
            v-if="showSearch"
            v-model="searchQuery"
            :placeholder="searchPlaceholder"
            class="search-input"
            clearable
            @input="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          <el-button
            text
            @click="goToTemplates"
            class="templates-btn"
          >
            <el-icon><Setting /></el-icon>
            模板管理
          </el-button>
          <el-button
            v-if="showCreateButton"
            type="primary"
            class="create-btn"
            @click="handleCreate"
          >
            <el-icon><Plus /></el-icon>
            {{ createButtonText }}
          </el-button>
        </div>
      </div>
    </header>

    <!-- 主内容区 -->
    <main class="app-main">
      <router-view
        :search-query="searchQuery"
        @update-header="updateHeader"
      />
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 响应式数据
const searchQuery = ref('')

// 头部状态管理
const headerState = ref({
  showBreadcrumb: false,
  breadcrumbText: '',
  showSearch: false,
  searchPlaceholder: '搜索...',
  showCreateButton: false,
  createButtonText: '新建'
})

// 计算属性
const showBreadcrumb = computed(() => headerState.value.showBreadcrumb)
const breadcrumbText = computed(() => headerState.value.breadcrumbText)
const showSearch = computed(() => headerState.value.showSearch)
const searchPlaceholder = computed(() => headerState.value.searchPlaceholder)
const showCreateButton = computed(() => headerState.value.showCreateButton)
const createButtonText = computed(() => headerState.value.createButtonText)

// 方法
const updateHeader = (config) => {
  headerState.value = { ...headerState.value, ...config }
}

const goBack = () => {
  router.back()
}

const handleCreate = () => {
  // 根据当前路由决定创建行为
  if (route.name === 'WorkspaceList') {
    router.push('/workspace/create')
  } else if (route.name === 'Workbench') {
    router.push(`/workspace/${route.params.id}/job/create`)
  }
}

const handleSearch = () => {
  // 搜索逻辑将通过事件传递给子组件
}

const goToTemplates = () => {
  router.push('/templates')
}
</script>

<style scoped>
.app-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f8f9fa;
}

.app-header {
  background-color: #fff;
  border-bottom: 1px solid #e5e7eb;
  padding: 0 24px;
  height: 64px;
  display: flex;
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 18px;
  color: #1f2937;
}

.logo-icon {
  font-size: 24px;
  color: #3b82f6;
}

.breadcrumb-back {
  color: #6b7280;
  font-size: 14px;
  padding: 0;
}

.breadcrumb-back:hover {
  color: #3b82f6;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.search-input {
  width: 300px;
}

.templates-btn {
  color: #6b7280;
  font-size: 14px;
  padding: 8px 12px;
}

.templates-btn:hover {
  color: #3b82f6;
  background: #f3f4f6;
}

.create-btn {
  height: 36px;
  border-radius: 6px;
  font-weight: 500;
}

.app-main {
  flex: 1;
  overflow: auto;
  padding: 24px;
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
