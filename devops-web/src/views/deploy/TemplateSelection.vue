<template>
  <div class="template-selection">
    <!-- 页面标题区域 -->
    <div class="page-header">
      <div class="header-left">
        <n-button text @click="goBack" class="back-button">
          <template #icon>
            <n-icon><ArrowBack /></n-icon>
          </template>
          {{ getBackButtonText() }}
        </n-button>
      </div>
      <div class="header-right">
        <n-input
          v-model="searchQuery"
          placeholder="搜索模板"
          clearable
          size="medium"
          style="width: 300px;"
        />
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
        <n-spin :show="loading">
          <div v-if="!loading && filteredTemplates.length === 0" class="empty-state">
            <n-empty description="没有找到匹配的模板" />
          </div>

          <div v-else class="templates-grid">
            <div
              v-for="template in filteredTemplates"
              :key="template.name"
              class="template-card"
              @click="selectTemplate(template)"
            >
              <div class="template-info">
                <div class="template-header">
                  <div class="template-meta">
                    <h3 class="template-name">{{ template.displayName || template.name }}</h3>
                  </div>
                </div>
                <p class="template-desc">{{ template.description || '暂无描述' }}</p>
                <div v-if="template.tags && template.tags.length > 0" class="template-tags">
                  <span
                    v-for="tag in template.tags"
                    :key="tag"
                    class="tag"
                  >
                    {{ tag }}
                  </span>
                </div>
                <div class="template-metadata-section">
                  <span class="template-source" :class="`source-${template.source}`">
                    {{ template.source === 'global' ? '全局' : '工作空间' }}
                  </span>
                  <span class="template-metadata" :class="{ 'has-metadata': template.hasMetadata }">
                    {{ template.hasMetadata ? '完整配置' : '基础模板' }}
                  </span>
                </div>
                <div v-if="template.author" class="template-footer">
                  <span class="template-author">{{ template.author }}</span>
                </div>
              </div>
              <div class="template-divider"></div>
              <div class="template-actions">
                <n-button
                  size="small"
                  @click.stop="viewTemplateFiles(template)"
                  class="action-button secondary-button"
                >
                  <template #icon>
                    <n-icon><Eye /></n-icon>
                  </template>
                  查看文件
                </n-button>
                <n-button
                  type="primary"
                  size="small"
                  @click.stop="selectTemplate(template)"
                  class="action-button primary-button"
                >
                  选择模板
                </n-button>
                <n-button
                  v-if="template.source === 'global'"
                  size="small"
                  @click.stop="openCopyDialog(template)"
                  class="action-button secondary-button"
                >
                  复制到工作空间
                </n-button>
              </div>
            </div>
          </div>
        </n-spin>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage, useDialog } from 'naive-ui'
import { ArrowBack, Eye } from '@vicons/ionicons5'
import { appTemplateApi, type AppTemplate } from '@/api/template'

console.log('TemplateSelection component loaded')

const router = useRouter()
const route = useRoute()
const message = useMessage()
const dialog = useDialog()

// 搜索查询
const searchQuery = ref('')

// 加载状态
const loading = ref(false)

// 当前工作空间
const workspaceName = computed(() => route.params.workspaceName as string)

// 当前选中的分类
const selectedCategory = ref('all')

// 分类数据
const categories = ref([
  { key: 'all', label: '所有模板' },
  { key: 'global', label: '全局模板' },
  { key: 'workspace', label: '工作空间模板' }
])

// 模板数据
const templates = ref<AppTemplate[]>([])

// 所有可用的分类
const availableCategories = ref<string[]>([])

// 所有可用的平台
const availablePlatforms = ref<string[]>([])

// 默认配置
const templateDefaults = ref<Record<string, any>>({})

// 过滤后的模板
const filteredTemplates = computed(() => {
  let filtered = templates.value

  console.log('过滤前模板数量:', templates.value.length)
  console.log('当前选中分类:', selectedCategory.value)

  // 按来源过滤
  if (selectedCategory.value && selectedCategory.value !== 'all') {
    if (selectedCategory.value === 'global') {
      filtered = filtered.filter(t => t.source === 'global')
      console.log('过滤全局模板后数量:', filtered.length)
    } else if (selectedCategory.value === 'workspace') {
      filtered = filtered.filter(t => t.source === 'workspace')
      console.log('过滤工作空间模板后数量:', filtered.length)
    }
  }

  // 按搜索关键词过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(t =>
      (t.displayName || t.name).toLowerCase().includes(query) ||
      (t.description || '').toLowerCase().includes(query) ||
      (t.tags || []).some((tag: string) => tag.toLowerCase().includes(query))
    )
    console.log('搜索过滤后数量:', filtered.length)
  }

  console.log('最终过滤结果数量:', filtered.length)
  return filtered
})

// 获取当前分类标签
const getCurrentCategoryLabel = () => {
  const category = categories.value.find(c => c.key === selectedCategory.value)
  return category ? category.label : '所有模板'
}




// 加载模板数据
const loadTemplates = async () => {
  loading.value = true
  try {
    const response = await appTemplateApi.getAllAppTemplates(workspaceName.value) as any

    // 合并全局模板和工作空间模板，并标识来源
    const allTemplates: AppTemplate[] = [
      ...(response.data?.templates?.global || []).map((t: any) => ({
        ...t,
        source: 'global' as const
      })),
      ...(response.data?.templates?.workspace || []).map((t: any) => ({
        ...t,
        source: 'workspace' as const
      }))
    ]

    templates.value = allTemplates
    availableCategories.value = response.data?.categories || []
    availablePlatforms.value = response.data?.platforms || []
    templateDefaults.value = response.data?.defaults || {}

    console.log('App模板加载成功:', allTemplates.length, '个模板')
  } catch (error: any) {
    console.error('加载App模板失败:', error)
    message.error(error.message || '获取App模板列表失败')

    // 如果API调用失败，使用默认模板数据
    templates.value = getDefaultTemplates()
  } finally {
    loading.value = false
  }
}



// 获取默认模板数据（作为fallback）
const getDefaultTemplates = (): AppTemplate[] => {
  return [
    {
      name: 'spring-boot',
      displayName: 'Spring Boot',
      description: 'Java Spring Boot 微服务应用模板',
      tags: ['微服务', 'Java', 'Spring'],
      author: 'DevOps Team',
      source: 'global',
      platform: 'kubernetes',
      hasMetadata: false
    },
    {
      name: 'vue-nginx',
      displayName: 'Vue + Nginx',
      description: 'Vue.js 前端应用，使用 Nginx 作为 Web 服务器',
      tags: ['前端', 'Vue', 'SPA'],
      author: 'DevOps Team',
      source: 'global',
      platform: 'kubernetes',
      hasMetadata: false
    },
    {
      name: 'python',
      displayName: 'Python App',
      description: 'Python Web 应用模板',
      tags: ['Python', 'Web'],
      author: 'DevOps Team',
      source: 'global',
      platform: 'kubernetes',
      hasMetadata: false
    }
  ]
}

// 选择模板
const selectTemplate = (template: AppTemplate) => {
  console.log('选择模板:', template)

  const fromQuery = route.query.from as string

  // 跳转到部署配置页面，传递模板信息和来源参数
  router.push({
    name: 'DeployConfig',
    params: {
      workspaceName: workspaceName.value
    },
    query: {
      template: template.name,
      ...(fromQuery && { from: fromQuery }) // 保持来源参数
    }
  })
}

// 查看模板文件
const viewTemplateFiles = (template: AppTemplate) => {
  console.log('查看模板文件:', template)

  // 根据模板来源决定跳转路由
  if (template.source === 'global') {
    // 全局模板
    router.push({
      name: 'AppTemplateDetail',
      params: {
        templateName: template.name
      }
    })
  } else {
    // 工作空间模板
    router.push({
      name: 'WorkspaceAppTemplateDetail',
      params: {
        workspace: workspaceName.value,
        templateName: template.name
      }
    })
  }
}

// 获取返回按钮文本
const getBackButtonText = () => {
  const fromQuery = route.query.from as string

  switch (fromQuery) {
    case 'cicd':
      return '流水线管理'
    case 'middleware':
      return '中间件管理'
    default:
      return '应用管理'
  }
}

// 智能返回上一页
const goBack = () => {
  const fromQuery = route.query.from as string
  const workspaceName = route.params.workspaceName as string

  // 始终根据来源参数决定返回位置，不依赖浏览器历史记录
  switch (fromQuery) {
    case 'cicd':
      // 从CI/CD页面来的，返回CI/CD管理页面
      router.push({ name: 'CICDManager', params: { workspaceName } })
      break
    case 'middleware':
      // 从中间件页面来的，返回中间件管理页面
      router.push({ name: 'MiddlewareManager', params: { workspaceName } })
      break
    default:
      // 默认返回应用管理页面
      router.push({ name: 'ApplicationManager', params: { workspaceName } })
  }
}

// 复制到工作空间
const copying = ref(false)
const copyForm = ref({ sourceName: '', newName: '' })

const openCopyDialog = (template: AppTemplate) => {
  dialog.success({
    title: '复制到工作空间',
    content: () => h('div', { style: 'display:flex; flex-direction:column; gap:8px;' }, [
      h('div', [`源模板: `, h('strong', template.name)]),
      h('div', [
        h('label', { style: 'display:block; font-size:12px; color:#666;' }, '新模板名'),
        h('input', {
          value: template.name,
          onInput: (e: any) => { copyForm.value.newName = e?.target?.value || '' },
          style: 'width:100%; padding:6px 8px; border:1px solid #e5e7eb; border-radius:6px;'
        })
      ])
    ]),
    positiveText: '复制',
    negativeText: '取消',
    onPositiveClick: async () => {
      const newName = copyForm.value.newName?.trim() || template.name
      if (!newName) {
        message.warning('请输入新模板名')
        return false
      }
      try {
        copying.value = true
        await appTemplateApi.copyToWorkspace(workspaceName.value, template.name, newName)
        message.success('复制成功')
        await loadTemplates()
      } catch (e: any) {
        message.error(e?.response?.data?.message || e?.message || '复制失败')
        return false
      } finally {
        copying.value = false
      }
    }
  })
}

// 组件挂载时加载数据
onMounted(() => {
  loadTemplates()
})
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
  padding: 12px;
}

.template-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.template-icon {
  font-size: 24px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.template-meta {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-name {
  margin: 0;
  font-size: var(--font-size-h4);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  font-family: var(--font-display);
  line-height: 1.5;
}

.template-badges {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

.template-source {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  line-height: 1.5;
}

.source-global {
  background: #DBEAFE;
  color: #1E40AF;
}

.source-workspace {
  background: #D1FAE5;
  color: #065F46;
}



.template-metadata {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 500;
  line-height: 1.5;
}

.template-metadata.has-metadata {
  background: #D1FAE5;
  color: #065F46;
}

.template-metadata:not(.has-metadata) {
  background: #FEF3C7;
  color: #92400E;
}

.template-metadata-section {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 4px;
  margin-bottom: 4px;
}

.template-desc {
  margin: 0 0 6px 0;
  font-size: var(--font-size-body);
  color: var(--text-secondary);
  line-height: 1.6;
  font-family: var(--font-text);
}

.template-footer {
  margin-top: 6px;
  font-size: 12px;
}

.template-author {
  color: #6B7280;
  line-height: 1.5;
}

.template-tags {
  display: flex;
  gap: 6px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}

.tag {
  background: #f0f0f0;
  color: var(--text-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-regular);
  font-family: var(--font-text);
  line-height: 1.5;
}

.template-divider {
  height: 1px;
  background: #e0e0e0;
  margin: 20px 0 12px 0;
}

.template-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 按钮优化 */
.action-button {
  font-weight: var(--font-weight-medium);
  font-size: 11px !important;
  border-radius: 4px;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  border: none !important;
  outline: none !important;
  padding: 4px 10px !important;
  height: auto !important;
  min-height: 22px !important;
  line-height: 1.3 !important;
}

.primary-button {
  background: #007AFF !important;
  color: white !important;
}

.primary-button:hover {
  background: #0056CC !important;
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 122, 255, 0.25);
}

.secondary-button {
  background: #f8f9fa !important;
  color: #6c757d !important;
  border: 1px solid #e9ecef !important;
}

.secondary-button:hover {
  background: #e9ecef !important;
  color: #495057 !important;
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.action-button:focus {
  border: none !important;
  outline: none !important;
}

.action-button:active {
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
