<template>
  <div class="global-template-manager">
    <div class="manager-header">
      <h2>全局模板管理</h2>
      <n-space>
        <n-button type="primary" @click="showCreateDialog = true">
          <template #icon>
            <n-icon><Add /></n-icon>
          </template>
          创建模板
        </n-button>
        <n-button @click="refreshData" :loading="loading">
          <template #icon>
            <n-icon><Refresh /></n-icon>
          </template>
          刷新
        </n-button>
      </n-space>
    </div>

    <!-- 模板统计 -->
    <div class="stats-section">
      <div class="stats-grid">
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-value">{{ templates.length }}</div>
            <div class="stat-label">总模板数</div>
          </div>
        </n-card>
        
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-value">{{ categoryCount }}</div>
            <div class="stat-label">分类数量</div>
          </div>
        </n-card>
        
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-value">{{ recentlyUpdated }}</div>
            <div class="stat-label">近期更新</div>
          </div>
        </n-card>
        
        <n-card class="stat-card">
          <div class="stat-content">
            <div class="stat-value">{{ popularTemplates }}</div>
            <div class="stat-label">热门模板</div>
          </div>
        </n-card>
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
            v-model:value="statusFilter"
            placeholder="状态筛选"
            clearable
            style="width: 120px;"
            :options="statusOptions"
          />
        </n-space>
      </n-card>
    </div>

    <!-- 模板列表 -->
    <div class="templates-section">
      <n-card title="模板列表">
        <n-data-table
          :columns="columns"
          :data="filteredTemplates"
          :pagination="pagination"
          :loading="loading"
          size="small"
        />
      </n-card>
    </div>

    <!-- 创建模板对话框 -->
    <n-modal v-model:show="showCreateDialog" style="width: 800px;">
      <n-card title="创建全局模板" :bordered="false" size="huge">
        <template #header-extra>
          <n-button quaternary circle @click="showCreateDialog = false">
            <template #icon>
              <n-icon><Close /></n-icon>
            </template>
          </n-button>
        </template>
        
        <div class="create-form">
          <n-alert type="info" style="margin-bottom: 16px;">
            全局模板将对所有工作空间可见，请确保模板的通用性和稳定性。
          </n-alert>
          
          <n-form ref="createFormRef" :model="createForm" :rules="createRules">
            <n-form-item label="模板名称" path="name">
              <n-input v-model:value="createForm.name" placeholder="redis-cluster" />
            </n-form-item>
            
            <n-form-item label="显示名称" path="displayName">
              <n-input v-model:value="createForm.displayName" placeholder="Redis 集群" />
            </n-form-item>
            
            <n-form-item label="分类" path="category">
              <n-select
                v-model:value="createForm.category"
                :options="categoryOptions"
                placeholder="选择分类"
              />
            </n-form-item>
            
            <n-form-item label="难度等级" path="difficulty">
              <n-select
                v-model:value="createForm.difficulty"
                :options="difficultyOptions"
                placeholder="选择难度"
              />
            </n-form-item>
            
            <n-form-item label="描述" path="description">
              <n-input
                v-model:value="createForm.description"
                type="textarea"
                :rows="3"
                placeholder="模板描述..."
              />
            </n-form-item>
            
            <n-form-item label="标签">
              <n-dynamic-tags v-model:value="createForm.tags" />
            </n-form-item>
          </n-form>
        </div>

        <template #footer>
          <div style="display: flex; justify-content: flex-end; gap: 12px;">
            <n-button @click="showCreateDialog = false">取消</n-button>
            <n-button type="primary" @click="createTemplate" :loading="creating">创建</n-button>
          </div>
        </template>
      </n-card>
    </n-modal>

    <!-- 编辑模板对话框 -->
    <n-modal v-model:show="showEditDialog" style="width: 800px;">
      <n-card title="编辑模板" :bordered="false" size="huge">
        <template #header-extra>
          <n-button quaternary circle @click="showEditDialog = false">
            <template #icon>
              <n-icon><Close /></n-icon>
            </template>
          </n-button>
        </template>
        
        <div class="edit-form">
          <n-empty description="编辑功能开发中..." />
        </div>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import { Add, Refresh, Search, Close, Create, Trash, Eye } from '@vicons/ionicons5'
import type { MiddlewareTemplate } from '@/types/middleware'
import { appTemplateApi } from '@/api/template'
import { useRoute, useRouter } from 'vue-router'

const message = useMessage()
const dialog = useDialog()
const router = useRouter()

const loading = ref(false)
const creating = ref(false)
const templates = ref<MiddlewareTemplate[]>([])
const showCreateDialog = ref(false)
const showEditDialog = ref(false)
const selectedTemplate = ref<MiddlewareTemplate | null>(null)

// 搜索和筛选
const searchQuery = ref('')
const categoryFilter = ref<string | null>(null)
const statusFilter = ref<string | null>(null)

// 创建表单
const createForm = ref({
  name: '',
  displayName: '',
  category: '',
  difficulty: '',
  description: '',
  tags: [] as string[]
})

const createRules = {
  name: { required: true, message: '请输入模板名称' },
  displayName: { required: true, message: '请输入显示名称' },
  category: { required: true, message: '请选择分类' },
  difficulty: { required: true, message: '请选择难度等级' },
  description: { required: true, message: '请输入描述' }
}

// 选项配置
const categoryOptions = [
  { label: '缓存系统', value: 'cache' },
  { label: '数据库', value: 'database' },
  { label: '消息队列', value: 'message-queue' },
  { label: '搜索引擎', value: 'search' },
  { label: '其他', value: 'other' }
]

const difficultyOptions = [
  { label: '简单 ✨', value: 'simple' },
  { label: '推荐 ⭐', value: 'recommended' },
  { label: '中级', value: 'intermediate' },
  { label: '高级', value: 'advanced' }
]

const statusOptions = [
  { label: '活跃', value: 'active' },
  { label: '已弃用', value: 'deprecated' },
  { label: '测试中', value: 'beta' }
]

// 表格列配置
const route = useRoute()
const workspaceName = computed(() => route.params.workspaceName as string)

const columns = [
  {
    title: '模板名称',
    key: 'name',
    render: (row: MiddlewareTemplate) => {
      return `${row.icon} ${row.name}`
    }
  },
  {
    title: '类型',
    key: 'type'
  },
  {
    title: '分类',
    key: 'category',
    render: (row: MiddlewareTemplate) => {
      const category = categoryOptions.find(c => c.value === row.category)
      return category?.label || row.category
    }
  },
  {
    title: '难度',
    key: 'difficulty',
    render: (row: MiddlewareTemplate) => {
      const difficulty = difficultyOptions.find(d => d.value === row.difficulty)
      return difficulty?.label || row.difficulty
    }
  },
  {
    title: '版本',
    key: 'version'
  },
  {
    title: '作者',
    key: 'author'
  },
  {
    title: '操作',
    key: 'actions',
    render: (row: MiddlewareTemplate) => {
      return [
        h('n-button', {
          size: 'small',
          onClick: () => viewTemplate(row)
        }, { default: () => '查看', icon: () => h(Eye) }),
        h('n-button', {
          size: 'small',
          style: 'margin-left: 8px;',
          onClick: () => editTemplate(row)
        }, { default: () => '编辑', icon: () => h(Create) }),
        h('n-button', {
          size: 'small',
          style: 'margin-left: 8px;',
          onClick: () => openCopyDialog(row)
        }, { default: () => '复制到工作空间' }),
        h('n-button', {
          size: 'small',
          type: 'error',
          style: 'margin-left: 8px;',
          onClick: () => deleteTemplate(row)
        }, { default: () => '删除', icon: () => h(Trash) })
      ]
    }
  }
]

// 分页配置
const pagination = {
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 20, 50],
  showQuickJumper: true
}

// 计算属性
const filteredTemplates = computed(() => {
  let filtered = templates.value

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(template => 
      template.name.toLowerCase().includes(query) ||
      template.type.toLowerCase().includes(query) ||
      template.description.toLowerCase().includes(query)
    )
  }

  // 分类过滤
  if (categoryFilter.value) {
    filtered = filtered.filter(template => template.category === categoryFilter.value)
  }

  // 状态过滤（这里需要根据实际的状态字段调整）
  if (statusFilter.value) {
    // 暂时跳过状态过滤，因为模板类型中没有status字段
  }

  return filtered
})

const categoryCount = computed(() => {
  const categories = new Set(templates.value.map(t => t.category))
  return categories.size
})

const recentlyUpdated = computed(() => {
  // 这里应该根据实际的更新时间字段计算
  return Math.floor(templates.value.length * 0.3)
})

const popularTemplates = computed(() => {
  // 这里应该根据实际的使用统计计算
  return Math.floor(templates.value.length * 0.2)
})

// 方法
const refreshData = async () => {
  loading.value = true
  try {
    // 这里应该调用实际的API获取全局模板列表
    // const response = await templateApi.getGlobalTemplates()
    // templates.value = response.templates
    
    // 临时使用模拟数据
    templates.value = [
      {
        name: 'redis-standalone',
        type: 'Redis',
        description: 'Redis 单机版',
        category: 'cache',
        difficulty: 'simple',
        icon: '🔴',
        platforms: ['kubernetes'],
        tags: ['缓存', '简单'],
        version: '7.0',
        author: 'DevOps Team',
        source: 'global'
      },
      {
        name: 'mysql-ha',
        type: 'MySQL',
        description: 'MySQL 高可用集群',
        category: 'database',
        difficulty: 'advanced',
        icon: '🗄️',
        platforms: ['kubernetes'],
        tags: ['数据库', '高可用'],
        version: '8.0',
        author: 'DevOps Team',
        source: 'global'
      }
    ]
  } catch (error: any) {
    message.error(error.message || '获取模板列表失败')
  } finally {
    loading.value = false
  }
}

const createTemplate = async () => {
  creating.value = true
  try {
    // 这里应该调用实际的API创建模板
    // await templateApi.createGlobalTemplate(createForm.value)
    
    message.success('模板创建成功')
    showCreateDialog.value = false
    createForm.value = {
      name: '',
      displayName: '',
      category: '',
      difficulty: '',
      description: '',
      tags: []
    }
    await refreshData()
  } catch (error: any) {
    message.error(error.message || '创建模板失败')
  } finally {
    creating.value = false
  }
}

const viewTemplate = (template: MiddlewareTemplate) => {
  router.push({
    name: 'TemplateDetail',
    params: {
      templateName: template.name
    }
  })
}

const editTemplate = (template: MiddlewareTemplate) => {
  selectedTemplate.value = template
  showEditDialog.value = true
}

const deleteTemplate = (template: MiddlewareTemplate) => {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除模板 "${template.name}" 吗？此操作不可恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        // 这里应该调用实际的API删除模板
        // await templateApi.deleteGlobalTemplate(template.name)
        
        message.success(`模板 ${template.name} 删除成功`)
        await refreshData()
      } catch (error: any) {
        message.error(error.message || '删除模板失败')
      }
    }
  })
}

// 复制到工作空间
const copying = ref(false)
const copyForm = ref({ sourceName: '', newName: '' })
const openCopyDialog = (template: MiddlewareTemplate) => {
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
        await appTemplateApi.copyToWorkspace(String(workspaceName.value || ''), template.name, newName)
        message.success('复制成功')
        await refreshData()
      } catch (e: any) {
        message.error(e?.response?.data?.message || e?.message || '复制失败')
        return false
      } finally {
        copying.value = false
      }
    }
  })
}

onMounted(() => {
  refreshData()
})
</script>

<style scoped>
.global-template-manager {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.manager-header h2 {
  margin: 0;
  color: #333;
}

.stats-section {
  margin-bottom: 24px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.stat-card {
  text-align: center;
}

.stat-content {
  padding: 8px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #666;
}

.filter-section {
  margin-bottom: 24px;
}

.templates-section {
  margin-bottom: 24px;
}

.create-form,
.edit-form {
  max-height: 500px;
  overflow-y: auto;
}

@media (max-width: 768px) {
  .global-template-manager {
    padding: 16px;
  }
  
  .manager-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }
  
  .filter-section :deep(.n-space) {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-section :deep(.n-space > *) {
    width: 100% !important;
  }
}
</style>
