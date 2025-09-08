<template>
  <div class="template-selector">
    <div class="selector-header">
      <div class="header-left">
        <n-button text @click="goBack">
          <template #icon>
            <n-icon><ArrowBack /></n-icon>
          </template>
          返回
        </n-button>
        <n-divider vertical />
        <h2>选择中间件模板</h2>
      </div>
    </div>

    <!-- 搜索和筛选 -->
    <div class="filter-section">
      <n-card>
        <n-space>
          <n-input 
            v-model:value="searchQuery" 
            placeholder="搜索模板..." 
            clearable
            style="width: 300px;"
          >
            <template #prefix>
              <n-icon><Search /></n-icon>
            </template>
          </n-input>
          
          <n-select
            v-model:value="categoryFilter"
            placeholder="分类筛选"
            clearable
            style="width: 150px;"
            :options="categoryOptions"
          />
          
          <n-select
            v-model:value="platformFilter"
            placeholder="平台筛选"
            clearable
            style="width: 150px;"
            :options="platformOptions"
          />
          
          <n-select
            v-model:value="difficultyFilter"
            placeholder="难度筛选"
            clearable
            style="width: 120px;"
            :options="difficultyOptions"
          />
        </n-space>
      </n-card>
    </div>

    <!-- 工作空间默认配置提示 -->
    <div class="workspace-defaults" v-if="workspaceDefaults">
      <n-alert type="info" :show-icon="false">
        <template #icon>
          <n-icon><InformationCircle /></n-icon>
        </template>
        <strong>工作空间默认配置:</strong>
        内存≥{{ workspaceDefaults.memory_limit }}, 
        存储≥{{ workspaceDefaults.storage_size }}
        <span v-if="workspaceDefaults.backup_enabled">, 启用备份</span>
        <span v-if="workspaceDefaults.monitoring_enabled">, 启用监控</span>
      </n-alert>
    </div>

    <!-- 模板网格 -->
    <div class="templates-section">
      <n-spin :show="loading">
        <div v-if="!filteredTemplates.length" class="empty-state">
          <n-empty description="没有找到匹配的模板" />
        </div>
        
        <div v-else>
          <!-- 全局模板 -->
          <div v-if="globalTemplates.length" class="template-group">
            <h3>全局模板</h3>
            <div class="templates-grid">
              <div v-for="template in globalTemplates" :key="template.name" class="template-with-actions">
                <TemplateCard
                  :template="template"
                  @select="selectTemplate"
                />
                <div class="template-actions">
                  <n-button size="small" @click.stop="openCopyModal(template.name)" class="copy-button">
                    复制到工作空间
                  </n-button>
                </div>
              </div>
            </div>
          </div>

          <!-- 工作空间模板 -->
          <div v-if="workspaceTemplates.length" class="template-group">
            <h3>工作空间模板 (自定义)</h3>
            <div class="templates-grid">
              <TemplateCard
                v-for="template in workspaceTemplates"
                :key="template.name"
                :template="template"
                @select="selectTemplate"
              />
            </div>
          </div>
        </div>
      </n-spin>
    </div>
  </div>

  <!-- 复制模板弹窗 -->
  <n-modal v-model:show="showCopyModal" preset="dialog" title="复制模板到工作空间" :mask-closable="false">
    <div class="copy-form">
      <n-form :model="copyForm">
        <n-form-item label="源模板名">
          <n-input v-model:value="copyForm.sourceName" disabled />
        </n-form-item>
        <n-form-item label="新模板名">
          <n-input v-model:value="copyForm.newName" placeholder="请输入新模板目录名" />
        </n-form-item>
      </n-form>
    </div>
    <template #action>
      <n-space>
        <n-button @click="showCopyModal = false" :disabled="copying">取消</n-button>
        <n-button type="primary" :loading="copying" @click="confirmCopy">复制</n-button>
      </n-space>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import { appTemplateApi } from '@/api/template'
import { ArrowBack, Search, InformationCircle } from '@vicons/ionicons5'
import { middlewareApi } from '@/api/middleware'
import type { MiddlewareTemplate, WorkspaceDefaults } from '@/types/middleware'
import TemplateCard from '@/components/middleware/TemplateCard.vue'

const route = useRoute()
const router = useRouter()
const message = useMessage()

const loading = ref(false)
const templates = ref<{
  global: MiddlewareTemplate[]
  workspace: MiddlewareTemplate[]
}>({ global: [], workspace: [] })
const workspaceDefaults = ref<WorkspaceDefaults | null>(null)
const categories = ref<string[]>([])
const platforms = ref<string[]>([])

// 筛选条件
const searchQuery = ref('')
const categoryFilter = ref<string | null>(null)
const platformFilter = ref<string | null>(null)
const difficultyFilter = ref<string | null>(null)

const workspaceName = computed(() => route.params.workspaceName as string)

// 筛选选项
const categoryOptions = computed(() => 
  categories.value.map(cat => ({
    label: getCategoryLabel(cat),
    value: cat
  }))
)

const platformOptions = computed(() => 
  platforms.value.map(platform => ({
    label: platform,
    value: platform
  }))
)

const difficultyOptions = [
  { label: '简单 ✨', value: 'simple' },
  { label: '推荐 ⭐', value: 'recommended' },
  { label: '中级', value: 'intermediate' },
  { label: '高级', value: 'advanced' }
]

// 过滤后的模板
const filteredTemplates = computed(() => {
  const allTemplates = [...templates.value.global, ...templates.value.workspace]
  
  return allTemplates.filter(template => {
    // 搜索过滤
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      if (!template.name.toLowerCase().includes(query) &&
          !template.description.toLowerCase().includes(query) &&
          !template.type.toLowerCase().includes(query)) {
        return false
      }
    }
    
    // 分类过滤
    if (categoryFilter.value && template.category !== categoryFilter.value) {
      return false
    }
    
    // 平台过滤
    if (platformFilter.value && !template.platforms.includes(platformFilter.value)) {
      return false
    }
    
    // 难度过滤
    if (difficultyFilter.value && template.difficulty !== difficultyFilter.value) {
      return false
    }
    
    return true
  })
})

const globalTemplates = computed(() => 
  filteredTemplates.value.filter(t => t.source === 'global')
)

const workspaceTemplates = computed(() => 
  filteredTemplates.value.filter(t => t.source === 'workspace')
)

const getCategoryLabel = (category: string) => {
  const labels: Record<string, string> = {
    'cache': '缓存系统',
    'database': '数据库',
    'message-queue': '消息队列',
    'search': '搜索引擎',
    'other': '其他'
  }
  return labels[category] || category
}

const loadTemplates = async () => {
  loading.value = true
  try {
    const response = await middlewareApi.getTemplates(workspaceName.value)
    templates.value = response.templates
    workspaceDefaults.value = response.defaults
    categories.value = response.categories
    platforms.value = response.platforms
  } catch (error: any) {
    message.error(error.message || '获取模板列表失败')
  } finally {
    loading.value = false
  }
}

const selectTemplate = (template: MiddlewareTemplate) => {
  router.push({
    name: 'MiddlewareConfig',
    params: {
      workspaceName: workspaceName.value,
      templateName: template.name
    }
  })
}

// 复制模板到工作空间逻辑
const showCopyModal = ref(false)
const copying = ref(false)
const copyForm = ref<{ sourceName: string; newName: string }>({ sourceName: '', newName: '' })

const openCopyModal = (sourceName: string) => {
  copyForm.value.sourceName = sourceName
  copyForm.value.newName = sourceName
  showCopyModal.value = true
}

const confirmCopy = async () => {
  if (!copyForm.value.newName.trim()) {
    message.warning('请输入新模板名')
    return
  }
  copying.value = true
  try {
    await appTemplateApi.copyToWorkspace(workspaceName.value, copyForm.value.sourceName, copyForm.value.newName.trim())
    message.success('复制成功')
    showCopyModal.value = false
    await loadTemplates()
  } catch (e: any) {
    message.error(e?.response?.data?.message || e?.message || '复制失败')
  } finally {
    copying.value = false
  }
}

const goBack = () => {
  // 检查是否有历史记录可以返回
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    // 如果没有历史记录，默认返回中间件管理页面
    router.push(`/workspace/${workspaceName.value}/middleware`)
  }
}

onMounted(() => {
  loadTemplates()
})
</script>

<style scoped>
.template-selector {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.selector-header {
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  color: #333;
}

.filter-section {
  margin-bottom: 24px;
}

.workspace-defaults {
  margin-bottom: 24px;
}

.templates-section {
  min-height: 400px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
}

.template-group {
  margin-bottom: 32px;
}

.template-group h3 {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 18px;
  font-weight: 600;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.template-with-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.template-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.copy-button {
  background: #f8f9fa !important;
  color: #6c757d !important;
  border: 1px solid #e9ecef !important;
  font-size: 12px !important;
  font-weight: 500 !important;
  border-radius: 6px !important;
  padding: 6px 12px !important;
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
}

.copy-button:hover {
  background: #e9ecef !important;
  color: #495057 !important;
  transform: translateY(-1px) scale(1.02) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
}

.copy-button:focus {
  border: 1px solid #e9ecef !important;
  outline: none !important;
}

.copy-button:active {
  transform: translateY(0) scale(0.98) !important;
}

@media (max-width: 768px) {
  .template-selector {
    padding: 16px;
  }
  
  .filter-section :deep(.n-space) {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-section :deep(.n-space > *) {
    width: 100% !important;
  }
  
  .templates-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
