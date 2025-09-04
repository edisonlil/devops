<template>
  <div class="template-selection">
    <!-- 页面标题区域 -->
    <div class="page-header">
      <div class="header-left">
        <n-button text @click="goBack" class="back-button">
          <template #icon>
            <n-icon><ArrowBack /></n-icon>
          </template>
          开发模板
        </n-button>
      </div>
      <div class="header-right">
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索模板"
          clearable
          size="medium"
          style="width: 300px;"
        >
          <template #prefix>
            <n-icon size="14"><Search /></n-icon>
          </template>
        </n-input>
      </div>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <!-- 左侧分类导航 -->
      <div class="sidebar">
        <div class="category-tabs">
          <div
            v-for="category in categories"
            :key="category.key"
            class="category-tab"
            :class="{ active: selectedCategory === category.key }"
            @click="selectedCategory = category.key"
          >
            {{ category.label }}
          </div>
        </div>
      </div>

      <!-- 右侧模板内容 -->
      <div class="content-area">
        <!-- 分类标题 -->
        <div class="category-header">
          <h2>{{ getCurrentCategoryLabel() }}</h2>
          <span class="more-link">更多</span>
        </div>

        <!-- 模板网格 -->
        <div class="templates-grid">
          <div
            v-for="template in filteredTemplates"
            :key="template.id"
            class="template-card"
            @click="selectTemplate(template)"
          >
            <div class="template-info">
              <h3 class="template-name">{{ template.name }}</h3>
              <p class="template-desc">{{ template.description }}</p>
              <div class="template-tags">
                <span
                  v-for="tag in template.tags"
                  :key="tag"
                  class="tag"
                >
                  {{ tag }}
                </span>
              </div>
            </div>
            <div class="template-divider"></div>
            <div class="template-actions">
              <n-button
                type="primary"
                size="small"
                @click.stop="selectTemplate(template)"
                style="border: none !important; border-width: 0 !important; outline: none !important;"
              >
                选择模板
              </n-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowBack, Search } from '@vicons/ionicons5'

console.log('TemplateSelection component loaded')

const router = useRouter()

// 搜索查询
const searchQuery = ref('')

// 当前选中的分类
const selectedCategory = ref('global')

// 分类数据
const categories = ref([
  { key: 'global', label: '所有模板' },
  { key: 'workspace', label: '我的模板' }
])

// 模板数据
const templates = ref([
  {
    id: 'spring-boot',
    name: 'Spring Boot',
    description: 'Java Spring Boot 微服务应用模板',
    type: 'java',
    category: 'global',
    tags: ['微服务', 'Java'],
    version: '2.7.0'
  },
  {
    id: 'vue-nginx',
    name: 'Vue + Nginx',
    description: 'Vue.js 前端应用，使用 Nginx 作为 Web 服务器',
    type: 'vue',
    category: 'global',
    tags: ['前端', 'Vue'],
    version: '3.0.0'
  },
  {
    id: 'golang-gin',
    name: 'Go + Gin',
    description: 'Go 语言 Gin 框架 Web 应用',
    type: 'golang',
    category: 'global',
    tags: ['微服务', 'Go'],
    version: '1.19.0'
  },
  {
    id: 'my-spring-boot',
    name: 'My Spring Boot',
    description: '我的自定义 Spring Boot 模板',
    type: 'java',
    category: 'workspace',
    tags: ['自定义', 'Java'],
    version: '1.0.0'
  }
])

// 过滤后的模板
const filteredTemplates = computed(() => {
  let filtered = templates.value

  // 按分类过滤
  if (selectedCategory.value !== 'global') {
    filtered = filtered.filter(t => t.category === selectedCategory.value)
  }

  // 按搜索关键词过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      t.tags.some(tag => tag.toLowerCase().includes(query))
    )
  }

  return filtered
})

// 获取当前分类标签
const getCurrentCategoryLabel = () => {
  const category = categories.value.find(c => c.key === selectedCategory.value)
  return category ? category.label : '所有模板'
}



// 选择模板
const selectTemplate = (template: any) => {
  router.push({
    name: 'DeployConfig',
    query: {
      template: template.id,
      type: template.type
    }
  })
}

// 返回应用管理页面
const goBack = () => {
  router.push({ name: 'ApplicationManager' })
}
</script>

<style scoped>
.template-selection {
  background: #ffffff;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
  background: #ffffff;
}

.back-button {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-medium);
  color: var(--text-primary);
}

.main-content {
  display: flex;
  height: calc(100vh - 81px);
}

.sidebar {
  width: 200px;
  background: #ffffff;
  padding: 24px 0;
}

.category-tabs {
  display: flex;
  flex-direction: column;
}

.category-tab {
  padding: 12px 24px;
  cursor: pointer;
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-regular);
  color: var(--text-secondary);
  transition: all 0.2s ease;
}

.category-tab:hover {
  background: #f0f0f0;
  color: var(--text-primary);
}

.category-tab.active {
  background: rgba(0, 122, 255, 0.08);
  color: #007AFF;
  border-right: 2px solid #007AFF;
  font-weight: var(--font-weight-medium);
}

.content-area {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #ffffff;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.category-header h2 {
  margin: 0;
  font-size: var(--font-size-h3);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  font-family: var(--font-display);
}

.more-link {
  font-size: var(--font-size-body);
  color: #007AFF;
  cursor: pointer;
  font-weight: var(--font-weight-regular);
}

.more-link:hover {
  color: #0056CC;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.template-card {
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 160px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.template-card:hover {
  transform: translateY(-2px);
  border-color: #007AFF;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.template-info {
  flex: 1;
}

.template-name {
  margin: 0 0 8px 0;
  font-size: var(--font-size-h4);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  font-family: var(--font-display);
}

.template-desc {
  margin: 0 0 16px 0;
  font-size: var(--font-size-body);
  color: var(--text-secondary);
  line-height: var(--line-height-relaxed);
  font-family: var(--font-text);
}

.template-tags {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.tag {
  background: #f0f0f0;
  color: var(--text-secondary);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-regular);
  font-family: var(--font-text);
}

.template-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 20px 0 12px 0;
}

.template-actions {
  display: flex;
  justify-content: flex-end;
}

/* 按钮优化 */
.template-actions .n-button {
  font-weight: var(--font-weight-medium);
  font-size: 12px !important;
  border-radius: 6px;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  border: none !important;
  outline: none !important;
  padding: 6px 12px !important;
  height: auto !important;
  min-height: 28px !important;
}

.template-actions .n-button:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.25);
  border: none !important;
}

.template-actions .n-button:focus {
  border: none !important;
  outline: none !important;
}

.template-actions .n-button:active {
  transform: translateY(0) scale(0.98);
  border: none !important;
  outline: none !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .main-content {
    flex-direction: column;
    height: auto;
  }

  .sidebar {
    width: 100%;
    padding: 16px 0;
  }

  .category-tabs {
    flex-direction: row;
    overflow-x: auto;
    padding: 0 24px;
  }

  .category-tab {
    white-space: nowrap;
    padding: 8px 16px;
    border-right: none;
    border-bottom: 2px solid transparent;
  }

  .category-tab.active {
    border-right: none;
    border-bottom: 2px solid #007AFF;
  }

  .content-area {
    padding: 16px;
  }

  .templates-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .page-header {
    padding: 16px;
  }
}
</style>
