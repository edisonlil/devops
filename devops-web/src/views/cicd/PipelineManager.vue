<template>
  <div class="pipeline-manager">
    <!-- 页面标题区域 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title text-h1">CI/CD 流水线管理</h1>
        <p class="page-subtitle text-subtitle">管理您的持续集成和持续部署流水线</p>
      </div>
      <div class="header-actions">
      </div>
    </div>



    <!-- 流水线列表 -->
    <div class="pipelines-section">
      <!-- 搜索和操作区域 -->
      <div class="search-section">
        <n-input
          v-model:value="searchQuery"
          placeholder="搜索流水线..."
          clearable
          size="medium"
          style="width: 300px;"
        >
          <template #prefix>
            <n-icon size="16"><Search /></n-icon>
          </template>
        </n-input>

        <n-button type="primary" @click="createPipeline">
          <template #icon>
            <n-icon><Add /></n-icon>
          </template>
          创建流水线
        </n-button>
      </div>

      <!-- 批量操作工具栏 -->
      <div v-if="hasSelectedPipelines" class="batch-actions-bar">
        <div class="batch-info">
          <span class="selected-count">已选择 {{ selectedPipelinesCount }} 项</span>
          <n-button size="small" text @click="clearSelection">取消选择</n-button>
        </div>
        <div class="batch-buttons">
          <n-button 
            size="small" 
            type="primary" 
            @click="batchExecute"
            :disabled="selectedPipelinesCount === 0"
          >
            批量执行
          </n-button>
          <n-button 
            size="small" 
            type="error" 
            @click="batchDelete"
            :disabled="selectedPipelinesCount === 0"
          >
            批量删除
          </n-button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="filteredPipelines.length === 0" class="empty-state">
        <h3 class="empty-title">暂无流水线</h3>
        <p class="empty-description">
          {{ searchQuery ? '没有找到匹配的流水线' : '开始创建您的第一个CI/CD流水线' }}
        </p>
        <n-button v-if="!searchQuery" type="primary" @click="createPipeline">
          创建流水线
        </n-button>
      </div>

      <!-- 流水线列表 -->
      <div v-else class="pipeline-list">
        <div class="table-container">
          <div class="table-header">
            <div class="col-checkbox">
              <n-checkbox
                :checked="isAllSelected"
                :indeterminate="isIndeterminate"
                @update:checked="handleSelectAll"
              />
            </div>
            <div class="col-name" @click="handleSort('name')">
              <span>名称</span>
              <n-icon class="sort-icon" :class="{ active: sortField === 'name' }">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </n-icon>
            </div>
            <div class="col-status" @click="handleSort('status')">
              <span>状态</span>
              <n-icon class="sort-icon" :class="{ active: sortField === 'status' }">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </n-icon>
            </div>
            <div class="col-deploy-count" @click="handleSort('deployCount')">
              <span>部署次数</span>
              <n-icon class="sort-icon" :class="{ active: sortField === 'deployCount' }">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </n-icon>
            </div>
            <div class="col-last-deploy" @click="handleSort('lastDeployAt')">
              <span>最后部署</span>
              <n-icon class="sort-icon" :class="{ active: sortField === 'lastDeployAt' }">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z"/>
                </svg>
              </n-icon>
            </div>

            <div class="col-actions">
              <span>操作</span>
            </div>
          </div>

          <div
            v-for="pipeline in paginatedPipelines"
            :key="pipeline.id"
            class="table-row"
          >
            <div class="col-checkbox">
              <n-checkbox
                :checked="selectedPipelines.includes(pipeline.id)"
                @update:checked="(checked) => handleSelectPipeline(pipeline.id, checked)"
              />
            </div>
            <div class="col-name">
              <div class="pipeline-info">
                <div class="pipeline-details">
                  <div class="pipeline-name">{{ pipeline.name }}</div>
                  <div class="pipeline-template">{{ pipeline.template }}</div>
                </div>
              </div>
            </div>

            <div class="col-status">
              <div class="status-indicator">
                <div class="status-dot" :class="`status-${pipeline.status}`"></div>
                <span class="status-text">{{ getStatusText(pipeline.status) }}</span>
              </div>
            </div>

            <div class="col-deploy-count">
              <span class="count-text">{{ pipeline.deployCount }}</span>
            </div>

            <div class="col-last-deploy">
              <span class="date-text">
                {{ pipeline.lastDeployAt ? formatDate(pipeline.lastDeployAt) : '从未部署' }}
              </span>
            </div>



            <div class="col-actions">
              <div class="action-buttons">
                <n-button
                  size="small"
                  type="primary"
                  @click="executePipeline(pipeline)"
                  :loading="pipeline.executing"
                >
                  执行
                </n-button>
                <n-button size="small" @click="viewPipeline(pipeline)">
                  查看
                </n-button>
                <n-dropdown
                  :options="getPipelineMenuOptions(pipeline)"
                  @select="(key) => handlePipelineAction(key, pipeline)"
                >
                  <n-button size="small" quaternary>
                    <template #icon>
                      <n-icon><EllipsisHorizontal /></n-icon>
                    </template>
                  </n-button>
                </n-dropdown>
              </div>
            </div>
          </div>

          <!-- 分页组件 -->
          <div class="pagination-section" v-if="totalCount > pageSize">
            <n-pagination
              v-model:page="currentPage"
              :page-count="Math.ceil(totalCount / pageSize)"
              :page-size="pageSize"
              :show-size-picker="true"
              :page-sizes="[10, 20, 50]"
              :show-quick-jumper="true"
              @update:page-size="pageSize = $event"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage, useDialog } from 'naive-ui'
import { Add, Search, EllipsisHorizontal } from '@vicons/ionicons5'
import { usePipelineStore, type Pipeline } from '@/stores/pipeline'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const dialog = useDialog()
const pipelineStore = usePipelineStore()

// 搜索查询
const searchQuery = ref('')
const sortField = ref('')
const sortOrder = ref('asc')
const currentPage = ref(1)
const pageSize = ref(10)

// 多选状态管理
const selectedPipelines = ref<string[]>([])
const isAllSelected = ref(false)
const isIndeterminate = ref(false)

// 工作空间相关状态
const workspaces = ref<Array<{id: string, name: string}>>([])
const loadingWorkspaces = ref(false)

// 计算属性
const filteredPipelines = computed(() => {
  let pipelines = pipelineStore.pipelines

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    pipelines = pipelines.filter(pipeline =>
      pipeline.name.toLowerCase().includes(query) ||
      pipeline.template.toLowerCase().includes(query)
    )
  }

  // 排序
  if (sortField.value) {
    pipelines = [...pipelines].sort((a, b) => {
      const aVal = a[sortField.value as keyof Pipeline]
      const bVal = b[sortField.value as keyof Pipeline]

      if (sortOrder.value === 'asc') {
        return aVal > bVal ? 1 : -1
      } else {
        return aVal < bVal ? 1 : -1
      }
    })
  }

  return pipelines
})

// 分页计算属性
const totalCount = computed(() => filteredPipelines.value.length)

const paginatedPipelines = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredPipelines.value.slice(start, end)
})

// 多选相关计算属性
const hasSelectedPipelines = computed(() => selectedPipelines.value.length > 0)
const selectedPipelinesCount = computed(() => selectedPipelines.value.length)

// 监听选择状态变化，更新全选状态
const updateSelectAllStatus = () => {
  const currentPagePipelines = paginatedPipelines.value
  const currentPageIds = currentPagePipelines.map(p => p.id)
  const selectedInCurrentPage = currentPageIds.filter(id => selectedPipelines.value.includes(id))
  
  if (selectedInCurrentPage.length === 0) {
    isAllSelected.value = false
    isIndeterminate.value = false
  } else if (selectedInCurrentPage.length === currentPageIds.length) {
    isAllSelected.value = true
    isIndeterminate.value = false
  } else {
    isAllSelected.value = false
    isIndeterminate.value = true
  }
}



// 方法
const handleSort = (field: string) => {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
}

// 多选相关方法
const handleSelectAll = (checked: boolean) => {
  const currentPagePipelines = paginatedPipelines.value
  const currentPageIds = currentPagePipelines.map(p => p.id)
  
  if (checked) {
    // 添加当前页所有流水线到选中列表
    currentPageIds.forEach(id => {
      if (!selectedPipelines.value.includes(id)) {
        selectedPipelines.value.push(id)
      }
    })
  } else {
    // 从选中列表中移除当前页所有流水线
    selectedPipelines.value = selectedPipelines.value.filter(id => !currentPageIds.includes(id))
  }
  
  updateSelectAllStatus()
}

const handleSelectPipeline = (pipelineId: string, checked: boolean) => {
  if (checked) {
    if (!selectedPipelines.value.includes(pipelineId)) {
      selectedPipelines.value.push(pipelineId)
    }
  } else {
    selectedPipelines.value = selectedPipelines.value.filter(id => id !== pipelineId)
  }
  
  updateSelectAllStatus()
}

const clearSelection = () => {
  selectedPipelines.value = []
  isAllSelected.value = false
  isIndeterminate.value = false
}

// 获取工作空间列表
const loadWorkspaces = async () => {
  try {
    loadingWorkspaces.value = true
    // 这里应该调用实际的API获取工作空间列表
    // 暂时使用模拟数据
    workspaces.value = [
      { id: 'wukong-crm', name: 'wukong-crm' },
      { id: 'wukong-test', name: 'wukong-test' },
      { id: 'gencode', name: 'gencode' },
      { id: 'docker-test', name: 'docker-test' }
    ]
  } catch (error) {
    console.error('获取工作空间列表失败:', error)
    message.error('获取工作空间列表失败')
  } finally {
    loadingWorkspaces.value = false
  }
}

// 显示复制对话框
const showCopyDialog = async (pipeline: Pipeline) => {
  // 先加载工作空间列表
  if (workspaces.value.length === 0) {
    await loadWorkspaces()
  }

  const currentWorkspaceName = route.params.workspaceName as string
  let selectedWorkspace = currentWorkspaceName
  let newName = `${pipeline.name} (副本)`
  
  // 使用 naive-ui 的对话框
  dialog.create({
    title: `复制流水线: ${pipeline.name}`,
    content: () => {
      const selectedWorkspaceRef = ref(currentWorkspaceName)
      const newNameRef = ref(newName)
      
      return h('div', { style: 'padding: 16px;' }, [
        h('div', { style: 'margin-bottom: 16px;' }, [
          h('label', { style: 'display: block; margin-bottom: 8px; font-weight: 500;' }, '流水线名称'),
          h('input', {
            value: newNameRef.value,
            onInput: (e: any) => newNameRef.value = e.target.value,
            style: 'width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;'
          })
        ]),
        h('div', { style: 'margin-bottom: 16px;' }, [
          h('label', { style: 'display: block; margin-bottom: 8px; font-weight: 500;' }, '目标工作空间'),
          h('select', {
            value: selectedWorkspaceRef.value,
            onChange: (e: any) => selectedWorkspaceRef.value = e.target.value,
            style: 'width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;'
          }, workspaces.value.map(ws => 
            h('option', { 
              value: ws.id,
              selected: ws.id === currentWorkspaceName
            }, ws.name)
          ))
        ]),
        h('div', { style: 'color: #6b7280; font-size: 14px;' }, [
          selectedWorkspaceRef.value === currentWorkspaceName 
            ? '复制到当前工作空间' 
            : `复制到工作空间: ${workspaces.value.find(w => w.id === selectedWorkspaceRef.value)?.name}`
        ])
      ])
    },
    positiveText: '复制',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        // 从对话框获取用户输入的值
        const dialogContent = document.querySelector('.n-dialog__content')
        if (!dialogContent) return false
        
        const nameInput = dialogContent.querySelector('input') as HTMLInputElement
        const workspaceSelect = dialogContent.querySelector('select') as HTMLSelectElement
        
        if (nameInput && workspaceSelect) {
          selectedWorkspace = workspaceSelect.value
          newName = nameInput.value
        }
        
        await copyPipelineToWorkspace(pipeline, selectedWorkspace, newName)
        message.success('流水线复制成功')
        return true
      } catch (error) {
        message.error(`复制流水线失败: ${error}`)
        return false
      }
    }
  })
}

// 复制流水线到指定工作空间
const copyPipelineToWorkspace = async (pipeline: Pipeline, targetWorkspace: string, newName: string) => {
  try {
    // 创建流水线副本
    const pipelineCopy = {
      ...pipeline,
      id: `${pipeline.id}_${Date.now()}`, // 生成新的ID
      name: newName,
      workspace: targetWorkspace
    }
    
    // 这里应该调用实际的API进行跨工作空间复制
    // 暂时使用本地存储模拟
    await pipelineStore.createPipeline(pipelineCopy)
    
    // 如果复制到其他工作空间，可能需要额外的API调用
    if (targetWorkspace !== route.params.workspaceName) {
      console.log(`复制流水线到工作空间: ${targetWorkspace}`)
      // 这里可以调用专门的跨工作空间复制API
    }
  } catch (error) {
    console.error('复制流水线失败:', error)
    throw error
  }
}

// 批量操作功能
const batchExecute = async () => {
  if (selectedPipelines.value.length === 0) {
    message.warning('请先选择要执行的流水线')
    return
  }

  try {
    const pipelineNames = selectedPipelines.value.map(id => {
      const pipeline = pipelineStore.getPipelineById(id)
      return pipeline?.name || id
    }).join('、')

    message.info(`正在批量执行 ${selectedPipelines.value.length} 个流水线: ${pipelineNames}`)
    
    // 这里可以实现批量执行的逻辑
    // 由于批量执行通常需要跳转到专门的批量执行页面，这里先清空选择
    clearSelection()
    message.success('批量执行任务已提交')
  } catch (error) {
    message.error(`批量执行失败: ${error}`)
  }
}

const batchDelete = async () => {
  if (selectedPipelines.value.length === 0) {
    message.warning('请先选择要删除的流水线')
    return
  }

  try {
    // 显示确认对话框
    const confirmed = await new Promise<boolean>((resolve) => {
      // 这里可以使用 naive-ui 的对话框组件
      // 为了简化，这里直接确认
      resolve(confirm(`确定要删除选中的 ${selectedPipelines.value.length} 个流水线吗？此操作不可撤销。`))
    })

    if (!confirmed) return

    // 执行批量删除
    const deletePromises = selectedPipelines.value.map(id => 
      pipelineStore.deletePipeline(id)
    )

    await Promise.all(deletePromises)
    
    message.success(`成功删除 ${selectedPipelines.value.length} 个流水线`)
    clearSelection()
  } catch (error) {
    message.error(`批量删除失败: ${error}`)
  }
}

const createPipeline = () => {
  // 跳转到应用部署页面来创建流水线，并传递来源信息
  const workspaceName = route.params.workspaceName
  router.push({
    path: `/workspace/${workspaceName}/manage/application/deploy`,
    query: {
      from: 'cicd' // 标识来源是CI/CD页面
    }
  })
}

const executePipeline = async (pipeline: Pipeline) => {
  try {
    message.info(`正在执行流水线: ${pipeline.name}`)

    // 跳转到执行页面显示详细过程
    const workspaceName = route.params.workspaceName
    router.push({
      name: 'PipelineExecution',
      params: {
        workspaceName,
        pipelineId: pipeline.id
      }
    })

  } catch (error) {
    message.error(`流水线执行失败: ${error}`)
  }
}

const viewPipeline = (pipeline: Pipeline) => {
  // 跳转到执行页面查看流水线状态和日志
  const workspaceName = route.params.workspaceName
  router.push({
    name: 'PipelineExecution',
    params: {
      workspaceName,
      pipelineId: pipeline.id
    },
    query: {
      view: 'true' // 标识这是查看模式，不是新执行
    }
  })
}

const editPipeline = (pipeline: Pipeline) => {
  // 跳转到部署配置页面进行编辑
  const workspaceName = route.params.workspaceName
  router.push({
    name: 'DeployConfig',
    params: {
      workspaceName
    },
    query: {
      edit: 'true', // 标识这是编辑模式
      pipelineId: pipeline.id,
      from: 'cicd' // 标识来源是CI/CD页面
    }
  })
}



// 监听分页变化，清空选择状态
const watchPageChange = () => {
  clearSelection()
}

// 监听搜索变化，清空选择状态
const watchSearchChange = () => {
  clearSelection()
}

// 初始化数据
onMounted(() => {
  const workspaceName = route.params.workspaceName as string

  // 临时清理：清除旧的假数据（可以在后续版本中移除）
  localStorage.removeItem('devops_pipelines')
  localStorage.removeItem('devops_deploy_history')

  pipelineStore.loadPipelines(workspaceName)
  
  // 监听分页和搜索变化
  watch(currentPage, watchPageChange)
  watch(searchQuery, watchSearchChange)
})



const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'never': '从未执行',
    'success': '执行成功',
    'failed': '执行失败',
    'running': '执行中'
  }
  return statusMap[status] || '未知'
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${Math.floor(diff / 86400000)}天前`
}

const getPipelineMenuOptions = (pipeline: any) => [
  {
    label: '编辑',
    key: `edit-${pipeline.id}`,
    pipeline
  },
  {
    label: '复制',
    key: `copy-${pipeline.id}`,
    pipeline
  },
  {
    label: '删除',
    key: `delete-${pipeline.id}`,
    pipeline
  }
]

const handlePipelineAction = async (key: string, pipelineParam?: Pipeline) => {
  const [action, id] = key.split('-')
  const pipeline = pipelineParam || pipelineStore.getPipelineById(id)

  switch (action) {
    case 'edit':
      if (pipeline) {
        editPipeline(pipeline)
      }
      break
    case 'copy':
      if (pipeline) {
        await showCopyDialog(pipeline)
      }
      break
    case 'delete':
      if (pipeline) {
        try {
          await pipelineStore.deletePipeline(id)
          message.success('流水线删除成功')
        } catch (error) {
          message.error('删除流水线失败')
        }
      }
      break
  }
}


</script>

<style scoped>
.pipeline-manager {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
  background: #ffffff;
  min-height: 100vh;
}

/* 页面头部样式 - 与ApplicationManager保持一致 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
  padding: 0 4px;
}

.header-content h1.page-title {
  margin: 0 0 8px 0;
}

.header-content .page-subtitle {
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 列表区域样式 */
.pipelines-section {
  margin-bottom: 24px;
}

/* 搜索和操作区域样式 */
.search-section {
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* 批量操作工具栏样式 */
.batch-actions-bar {
  display: flex;
  justify-content: flex-start;
  align-items: center;
  padding: 12px 16px;
  margin-bottom: 20px;
  background: #F0F9FF;
  border: 1px solid #BFDBFE;
  border-radius: 6px;
  min-height: 44px;
  gap: 24px;
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 100%;
}

.selected-count {
  font-size: 14px;
  color: #1E40AF;
  font-weight: 500;
  line-height: 1.4;
}

.batch-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  height: 100%;
}

.batch-buttons .n-button {
  height: 32px;
  min-width: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 分页区域样式 */
.pagination-section {
  margin-top: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 确保按钮无边框 */
.n-button--primary-type .n-button__border,
.n-button--primary-type .n-button__state-border {
  display: none !important;
}

/* 表格容器样式 */
.table-container {
  background: #FFFFFF;
  width: 100%;
}

.table-header {
  display: grid;
  grid-template-columns: 50px 180px 180px 150px  150px 120px;
  gap: 24px;
  padding: 16px 0 16px 24px;
  background: #FFFFFF;
  font-size: var(--font-size-caption);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  border-bottom: 1px solid #F0F0F0;
}

.table-header > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  transition: color 0.2s ease;
}

.table-header > div:hover {
  color: #666666;
}

.table-header .col-actions {
  cursor: default;
}

/* 表头数字列居中 */
.table-header .col-deploy-count {
  justify-content: center;
  position: relative;
}

.table-header .col-deploy-count span {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.table-header .col-deploy-count .sort-icon {
  margin-left: auto;
}

.table-header .col-actions:hover {
  color: #8C8C8C;
}

.sort-icon {
  font-size: 12px;
  color: #D9D9D9;
  transition: all 0.2s ease;
}

.sort-icon.active {
  color: #8C8C8C;
}

.table-body {
  background: #FFFFFF;
}

.table-row {
  display: grid;
  grid-template-columns: 50px 180px 180px 150px 150px 120px;
  gap: 24px;
  padding: 16px 0 16px 24px;
  transition: all 0.2s ease;
  align-items: center;
  min-height: 60px;
  background: #FFFFFF;
  border-bottom: 1px solid #F5F5F5;
}

.table-row:last-child {
  border-bottom: none;
}

.table-row:hover {
  background: #F8F9FA;
}

/* 复选框列样式 */
.col-checkbox {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

/* 确保所有列都左对齐 */
.col-name,
.col-status,
.col-last-deploy,
.col-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.table-header .col-actions {
  justify-content: center;
}

/* 数字列居中对齐 */
.col-deploy-count {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 流水线信息 */
.pipeline-info {
  display: flex;
  align-items: center;
}

.pipeline-details {
  flex: 1;
}

.pipeline-name {
  font-size: var(--font-size-body);
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
  margin-bottom: 2px;
  line-height: var(--line-height-normal);
}

.pipeline-template {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
  line-height: var(--line-height-normal);
}

/* 类型样式 */
.type-text {
  font-size: var(--font-size-caption);
  color: var(--text-primary);
  font-weight: var(--font-weight-regular);
}

/* 状态指示器 */
.status-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.status-dot.status-never {
  background-color: #BFBFBF;
}

.status-dot.status-success {
  background-color: #52C41A;
}

.status-dot.status-failed {
  background-color: #FF4D4F;
}

.status-dot.status-running {
  background-color: #1890FF;
}

.status-text {
  font-size: var(--font-size-caption);
  color: var(--text-primary);
  font-weight: var(--font-weight-regular);
}

/* 计数和日期文本 */
.count-text,
.date-text {
  font-size: var(--font-size-caption);
  color: var(--text-secondary);
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}

/* 空状态样式 */
.empty-state {
  text-align: center;
  padding: 64px 24px;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #1F2937;
  margin: 0 0 8px 0;
}

.empty-description {
  font-size: 14px;
  color: #6B7280;
  margin: 0 0 24px 0;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .table-header,
  .table-row {
    grid-template-columns: 40px 150px 90px 110px 1fr 110px;
    gap: 16px;
    padding: 16px 20px;
    font-size: 12px;
    min-height: 60px;
  }

  .sort-icon {
    font-size: 14px;
  }
}

@media (max-width: 480px) {
  .table-header,
  .table-row {
    grid-template-columns: 40px 1fr 70px 110px;
    gap: 16px;
    padding: 16px 16px;
    min-height: 64px;
  }

  .col-deploy-count,
  .col-last-deploy {
    display: none;
  }

  .action-buttons {
    flex-direction: column;
    gap: 8px;
  }

  .pipeline-name {
    font-size: var(--font-size-body);
  }

  .pipeline-template {
    font-size: var(--font-size-small);
  }
}
</style>
