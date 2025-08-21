<template>
  <div class="template-management">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-info">
        <h1 class="page-title">模板管理</h1>
        <p class="page-subtitle">管理全局模板和工作空间模板</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="createTemplate">
          <el-icon><Plus /></el-icon>
          新建模板
        </el-button>
      </div>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="searchQuery"
        placeholder="搜索模板..."
        clearable
        class="search-input"
      >
        <template #prefix>
          <el-icon><Search /></el-icon>
        </template>
      </el-input>
    </div>

    <!-- 主内容区 - Sealos 风格布局 -->
    <div class="template-content">
      <!-- 左侧分类导航 -->
      <div class="category-sidebar">
        <div class="category-section">
          <h3 class="section-title">
            <el-icon><Box /></el-icon>
            应用分类
          </h3>
          <div class="category-list">
            <div
              v-for="category in categories"
              :key="category.value"
              :class="['category-item', { active: selectedCategory === category.value }]"
              @click="selectCategory(category.value)"
            >
              <el-icon class="category-icon">
                <component :is="category.icon" />
              </el-icon>
              <span class="category-label">{{ category.label }}</span>
              <span class="category-count">{{ getCategoryCount(category.value) }}</span>
            </div>
          </div>
        </div>

        <div class="category-section">
          <h3 class="section-title">
            <el-icon><Setting /></el-icon>
            部署平台
          </h3>
          <div class="platform-list">
            <div
              v-for="platform in platforms"
              :key="platform.value"
              :class="['platform-item', { active: selectedPlatform === platform.value }]"
              @click="selectPlatform(platform.value)"
            >
              <el-icon class="platform-icon">
                <component :is="platform.icon" />
              </el-icon>
              <span class="platform-label">{{ platform.label }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧模板展示区 -->
      <div class="template-main">
        <!-- 模板网格 -->
        <div class="template-grid" v-loading="loading">
          <!-- 新建模板卡片 -->
          <div class="template-card create-card" @click="createTemplate">
            <div class="create-content">
              <el-icon class="create-icon"><Plus /></el-icon>
              <span class="create-text">新建模板</span>
              <p class="create-desc">创建自定义部署模板</p>
            </div>
          </div>

          <!-- 模板卡片 -->
          <div
            v-for="template in filteredTemplates"
            :key="template.id"
            class="template-card"
            @click="selectTemplate(template)"
          >
            <div class="card-header">
              <div class="template-icon-wrapper">
                <el-icon class="template-icon" :style="{ color: template.iconColor || '#409EFF' }">
                  <component :is="template.icon || 'Box'" />
                </el-icon>
              </div>
              <div class="template-badges">
                <el-tag
                  :type="template.scope === 'global' ? 'success' : 'info'"
                  size="small"
                  class="scope-badge"
                >
                  {{ template.scope === 'global' ? '全局' : '工作空间' }}
                </el-tag>
              </div>
            </div>

            <div class="card-body">
              <h4 class="template-title">{{ template.name }}</h4>
              <p class="template-description">{{ template.description }}</p>

              <div class="template-meta">
                <div class="meta-item">
                  <el-icon><User /></el-icon>
                  <span>{{ template.author || '未知' }}</span>
                </div>
                <div class="meta-item">
                  <el-icon><Calendar /></el-icon>
                  <span>{{ formatDate(template.createdAt) }}</span>
                </div>
              </div>

              <div class="template-platforms">
                <el-tag
                  v-for="platform in (template.platformTypes || []).slice(0, 3)"
                  :key="platform"
                  size="small"
                  class="platform-tag"
                >
                  {{ getPlatformLabel(platform) }}
                </el-tag>
                <span v-if="(template.platformTypes || []).length > 3" class="more-platforms">
                  +{{ (template.platformTypes || []).length - 3 }}
                </span>
              </div>

              <div class="template-files" v-if="template.files">
                <div class="file-info">
                  <el-icon><Document /></el-icon>
                  <span>包含 Dockerfile + 部署文件</span>
                </div>
              </div>
            </div>

            <div class="card-footer">
              <el-button type="primary" text size="small" @click.stop="useTemplate(template)">
                <el-icon><VideoPlay /></el-icon>
                使用模板
              </el-button>
              <el-dropdown trigger="click" @command="handleTemplateAction">
                <el-button text size="small" @click.stop>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="{ action: 'view', template }">
                      <el-icon><View /></el-icon>
                      查看详情
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'edit', template }">
                      <el-icon><Edit /></el-icon>
                      编辑模板
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'copy', template }">
                      <el-icon><CopyDocument /></el-icon>
                      复制模板
                    </el-dropdown-item>
                    <el-dropdown-item :command="{ action: 'delete', template }" divided>
                      <el-icon><Delete /></el-icon>
                      删除模板
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="!loading && filteredTemplates.length === 0" class="empty-state">
          <el-empty description="暂无模板">
            <el-button type="primary" @click="createTemplate">创建第一个模板</el-button>
          </el-empty>
        </div>
      </div>
    </div>

    <!-- 模板详情/编辑对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="getDialogTitle()"
      width="90%"
      :close-on-click-modal="false"
      class="template-dialog"
    >
      <div v-if="dialogMode === 'view' && currentTemplate" class="template-detail">
        <div class="template-info">
          <div class="info-header">
            <div class="template-icon-large">
              <el-icon :style="{ color: currentTemplate.iconColor || '#409EFF' }">
                <component :is="currentTemplate.icon || 'Box'" />
              </el-icon>
            </div>
            <div class="info-content">
              <h2>{{ currentTemplate.name }}</h2>
              <p>{{ currentTemplate.description }}</p>
              <div class="info-meta">
                <el-tag :type="currentTemplate.scope === 'global' ? 'success' : 'info'" size="small">
                  {{ currentTemplate.scope === 'global' ? '全局模板' : '工作空间模板' }}
                </el-tag>
                <span>作者: {{ currentTemplate.author }}</span>
                <span>创建时间: {{ formatDate(currentTemplate.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="template-files-detail" v-if="currentTemplate.files">
          <el-tabs>
            <el-tab-pane label="Dockerfile" name="dockerfile">
              <Codemirror
                :model-value="currentTemplate.files.dockerfile"
                :extensions="[StreamLanguage.define(dockerFile)]"
                :disabled="true"
                style="height: 400px"
              />
            </el-tab-pane>
            <el-tab-pane label="部署文件" name="deploy">
              <Codemirror
                :model-value="currentTemplate.files.deployYaml"
                :extensions="[yaml()]"
                :disabled="true"
                style="height: 400px"
              />
            </el-tab-pane>
          </el-tabs>
        </div>
      </div>

      <TemplateEditor
        v-else-if="dialogVisible"
        :mode="dialogMode"
        :template="currentTemplate"
        @save="handleSave"
        @cancel="handleCancel"
      />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { templatesApi } from '../api/index.js'
import TemplateEditor from '../components/TemplateEditor.vue'
import { Codemirror } from 'vue-codemirror'
import { yaml } from '@codemirror/lang-yaml'
import { StreamLanguage } from '@codemirror/language'
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile'

const router = useRouter()
const emit = defineEmits(['update-header'])

// 响应式数据
const loading = ref(false)
const templates = ref([])
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

const dialogVisible = ref(false)
const dialogMode = ref('view') // 'view', 'edit', 'create'
const currentTemplate = ref(null)

// Sealos 风格的选择状态
const selectedCategory = ref('all')
const selectedPlatform = ref('all')
const searchQuery = ref('')

// 分类数据 - 只保留 Java 和 Vue 相关
const categories = ref([
  { label: '全部应用', value: 'all', icon: 'Grid' },
  { label: '前端应用', value: 'frontend', icon: 'Monitor' },
  { label: '后端服务', value: 'backend', icon: 'Server' }
])

// 平台数据
const platforms = ref([
  { label: '全部平台', value: 'all', icon: 'Grid' },
  { label: 'Kubernetes', value: 'KUBERNETES', icon: 'Platform' },
  { label: 'Docker Swarm', value: 'DOCKER_SWARM', icon: 'Box' },
  { label: 'Docker Compose', value: 'DOCKER_COMPOSE', icon: 'Document' }
])

// 计算属性
const filteredTemplates = computed(() => {
  let result = templates.value

  // 按分类筛选
  if (selectedCategory.value !== 'all') {
    result = result.filter(t => t.category === selectedCategory.value)
  }

  // 按平台筛选
  if (selectedPlatform.value !== 'all') {
    result = result.filter(t => (t.platformTypes || []).includes(selectedPlatform.value))
  }

  // 搜索筛选
  if (searchQuery.value) {
    const search = searchQuery.value.toLowerCase()
    result = result.filter(t =>
      t.name.toLowerCase().includes(search) ||
      (t.description || '').toLowerCase().includes(search) ||
      (t.tags || []).some(tag => tag.toLowerCase().includes(search))
    )
  }

  total.value = result.length
  const start = (currentPage.value - 1) * pageSize.value
  return result.slice(start, start + pageSize.value)
})

// 方法
const loadTemplates = async () => {
  loading.value = true
  try {
    const response = await templatesApi.getTemplates({
      category: selectedCategory.value !== 'all' ? selectedCategory.value : undefined,
      platformType: selectedPlatform.value !== 'all' ? selectedPlatform.value : undefined,
      search: searchQuery.value || undefined
    })

    // 后端返回的数据结构是 { success: true, data: { templates: [...], categories: [...] } }
    templates.value = response.data.data.templates || []

    // 更新分类计数
    if (response.data.data.categories) {
      // 合并后端返回的分类数据和前端的分类数据
      const backendCategories = response.data.data.categories || []
      categories.value = backendCategories.length > 0 ? backendCategories : categories.value
    }

  } catch (error) {
    console.error('加载模板失败:', error)
    ElMessage.error('加载模板失败')
    // API 调用失败时使用空数组
    templates.value = []
  } finally {
    loading.value = false
  }
}

// Sealos 风格的交互方法


// Sealos 风格的交互方法
const selectCategory = (category) => {
  selectedCategory.value = category
}

const selectPlatform = (platform) => {
  selectedPlatform.value = platform
}

const selectTemplate = (template) => {
  currentTemplate.value = template
  dialogMode.value = 'view'
  dialogVisible.value = true
}

const useTemplate = (template) => {
  // 跳转到使用模板的页面，或者打开配置对话框
  ElMessage.success(`准备使用模板: ${template.name}`)
  // 这里可以跳转到部署页面并预填模板信息
  // 暂时跳转到工作空间列表，实际应该跳转到部署配置页面
  router.push('/')
}

const getCategoryCount = (categoryValue) => {
  if (categoryValue === 'all') {
    return templates.value.length
  }
  return templates.value.filter(t => t.category === categoryValue).length
}

const handleTemplateAction = ({ action, template }) => {
  switch (action) {
    case 'view':
      selectTemplate(template)
      break
    case 'edit':
      currentTemplate.value = template
      dialogMode.value = 'edit'
      dialogVisible.value = true
      break
    case 'copy':
      copyTemplate(template)
      break
    case 'delete':
      deleteTemplate(template)
      break
  }
}

const copyTemplate = async (template) => {
  try {
    const newTemplate = {
      ...template,
      id: undefined,
      name: `${template.name} - 副本`,
      scope: 'workspace'
    }

    await templatesApi.createTemplate(newTemplate)
    ElMessage.success('模板复制成功')
    await loadTemplates()
  } catch (error) {
    console.error('复制模板失败:', error)
    ElMessage.error('复制模板失败')
  }
}

const getDialogTitle = () => {
  switch (dialogMode.value) {
    case 'create': return '新建模板'
    case 'edit': return '编辑模板'
    case 'view': return '模板详情'
    default: return '模板'
  }
}

const createTemplate = () => {
  currentTemplate.value = null
  dialogMode.value = 'create'
  dialogVisible.value = true
}

// 这些函数已经被 handleTemplateAction 替代，可以删除

const deleteTemplate = async (template) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除模板 "${template.name}" 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
        confirmButtonClass: 'el-button--danger'
      }
    )

    await templatesApi.deleteTemplate(template.id)
    ElMessage.success('模板删除成功')
    loadTemplates()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除模板失败:', error)
      ElMessage.error('删除模板失败')
    }
  }
}

const handleSave = async (templateData) => {
  try {
    if (dialogMode.value === 'create') {
      await templatesApi.createTemplate(templateData)
      ElMessage.success('模板创建成功')
    } else {
      await templatesApi.updateTemplate(currentTemplate.value.id, templateData)
      ElMessage.success('模板更新成功')
    }

    dialogVisible.value = false
    loadTemplates()
  } catch (error) {
    console.error('保存模板失败:', error)
    ElMessage.error('保存模板失败')
  }
}

const handleCancel = () => {
  dialogVisible.value = false
}

// getCategoryLabel 函数已删除，不再需要

const getPlatformLabel = (platform) => {
  const labels = {
    KUBERNETES: 'K8s',
    DOCKER_SWARM: 'Swarm',
    DOCKER_COMPOSE: 'Compose'
  }
  return labels[platform] || platform
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

// 监听搜索变化
watch(searchQuery, () => {
  // 搜索时重置到第一页
})

// 生命周期
onMounted(() => {
  emit('update-header', {
    showBreadcrumb: false,
    showSearch: false,
    showCreateButton: false
  })

  loadTemplates()
})
</script>

<style scoped>
.template-management {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.search-bar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 24px;
}

.search-input {
  width: 300px;
}

.template-list {
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.template-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.template-icon {
  font-size: 16px;
  color: #3b82f6;
}

.platform-tag {
  margin-right: 4px;
  margin-bottom: 2px;
}

.more-platforms {
  font-size: 12px;
  color: #9ca3af;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 24px;
}

:deep(.el-table__row) {
  cursor: pointer;
}

:deep(.el-table__row:hover) {
  background-color: #f9fafb;
}

/* Sealos 风格的主内容布局 */
.template-content {
  display: flex;
  gap: 24px;
  height: calc(100vh - 200px);
}

/* 左侧分类导航 */
.category-sidebar {
  width: 280px;
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow-y: auto;
}

.category-section {
  margin-bottom: 32px;
}

.category-section:last-child {
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.category-list,
.platform-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.category-item,
.platform-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6b7280;
}

.category-item:hover,
.platform-item:hover {
  background-color: #f3f4f6;
  color: #374151;
}

.category-item.active,
.platform-item.active {
  background-color: #eff6ff;
  color: #2563eb;
  font-weight: 500;
}

.category-icon,
.platform-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.category-label,
.platform-label {
  flex: 1;
  font-size: 14px;
}

.category-count {
  font-size: 12px;
  background-color: #e5e7eb;
  color: #6b7280;
  padding: 2px 8px;
  border-radius: 12px;
  min-width: 20px;
  text-align: center;
}

.category-item.active .category-count {
  background-color: #dbeafe;
  color: #2563eb;
}

/* 右侧模板展示区 */
.template-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.template-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  padding: 4px;
  overflow-y: auto;
  flex: 1;
}

/* 模板卡片样式 */
.template-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border: 1px solid #e5e7eb;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  height: 280px;
}

.template-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  border-color: #d1d5db;
  transform: translateY(-2px);
}

.create-card {
  border: 2px dashed #d1d5db;
  background: #fafafa;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.create-card:hover {
  border-color: #3b82f6;
  background: #f8faff;
}

.create-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.create-icon {
  font-size: 48px;
  color: #9ca3af;
}

.create-card:hover .create-icon {
  color: #3b82f6;
}

.create-text {
  font-size: 16px;
  font-weight: 500;
  color: #374151;
}

.create-desc {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.template-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.template-icon {
  font-size: 24px;
}

.template-badges {
  display: flex;
  gap: 8px;
}

.scope-badge {
  font-size: 12px;
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.template-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.template-description {
  font-size: 14px;
  color: #6b7280;
  line-height: 1.5;
  margin: 0 0 16px 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.template-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #9ca3af;
}

.meta-item .el-icon {
  font-size: 14px;
}

.template-platforms {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 16px;
}

.template-platforms .platform-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  margin: 0;
}

.template-platforms .more-platforms {
  font-size: 12px;
  color: #6b7280;
  padding: 2px 8px;
}

.template-files {
  margin-bottom: 16px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #059669;
  background: #ecfdf5;
  padding: 4px 8px;
  border-radius: 4px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 16px;
  border-top: 1px solid #f3f4f6;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

/* 对话框样式 */
.template-dialog {
  --el-dialog-border-radius: 12px;
}

.template-dialog .el-dialog__header {
  padding: 24px 24px 0 24px;
}

.template-dialog .el-dialog__body {
  padding: 24px;
}

/* 模板详情样式 */
.template-detail {
  max-height: 70vh;
  overflow-y: auto;
}

.template-info {
  margin-bottom: 24px;
}

.info-header {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.template-icon-large {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: #f3f4f6;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  flex-shrink: 0;
}

.info-content h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
}

.info-content p {
  margin: 0 0 16px 0;
  color: #6b7280;
  line-height: 1.5;
}

.info-meta {
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 14px;
  color: #9ca3af;
}

.template-files-detail {
  border-top: 1px solid #e5e7eb;
  padding-top: 24px;
}

.code-editor {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
}

.code-editor :deep(.el-textarea__inner) {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: #f8f9fa;
}
</style>
