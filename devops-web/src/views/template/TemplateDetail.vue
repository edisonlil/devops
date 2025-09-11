<template>
  <div class="template-detail">
    <!-- 头部信息 -->
    <div class="header-section">
      <n-card>
        <div class="header-content">
          <div class="back-button">
            <n-button @click="goBack" quaternary size="small">
              <template #icon>
                <n-icon><ArrowBack /></n-icon>
              </template>
              返回
            </n-button>
          </div>
          
          <div class="template-info">
            <div class="template-title">
              <h2 class="text-h3">{{ templateInfo?.name || templateName }}</h2>
              <n-tag v-if="source === 'workspace'" type="warning" size="small">
                工作空间模板
              </n-tag>
              <n-tag v-else type="info" size="small">
                全局模板
              </n-tag>
            </div>
            <p class="template-description text-body">
              {{ templateInfo?.description || '暂无描述' }}
            </p>
          </div>
        </div>
      </n-card>
    </div>

    <!-- 主要内容区域 -->
    <div class="main-content">
      <n-layout has-sider>
        <!-- 左侧文件列表 -->
        <n-layout-sider
          bordered
          collapse-mode="width"
          :collapsed-width="0"
          :width="300"
          show-trigger
          class="file-sidebar"
        >
          <div class="file-list-container">
            <div class="file-list-header">
              <h3 class="text-h4">模板文件</h3>
              <n-button
                @click="refreshFiles"
                quaternary
                size="tiny"
                :loading="loading"
              >
                <template #icon>
                  <n-icon><Refresh /></n-icon>
                </template>
              </n-button>
            </div>
            
            <n-spin :show="loading">
              <div class="file-list">
                <div
                  v-for="file in files"
                  :key="file.name"
                  class="file-item"
                  :class="{
                    active: selectedFile?.name === file.name,
                    editing: isEditing && selectedFile?.name === file.name
                  }"
                  @click="selectFile(file)"
                >
                  <div class="file-info">
                    <div class="file-name text-body">
                      {{ file.name }}
                      <n-tag v-if="isEditing && selectedFile?.name === file.name" size="tiny" type="warning">
                        编辑中
                      </n-tag>
                    </div>
                    <div class="file-meta text-caption">
                      {{ getFileTypeText(file) }}
                      <span v-if="file.size"> · {{ formatFileSize(file.size) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </n-spin>
          </div>
        </n-layout-sider>

        <!-- 右侧文件内容 -->
        <n-layout-content class="file-content-area">
          <n-card v-if="!selectedFile" class="empty-state">
            <div class="empty-content">
              <n-icon size="48" color="#c0c4cc">
                <Document />
              </n-icon>
              <p class="text-body">请选择一个文件查看内容</p>
            </div>
          </n-card>

          <n-card v-else class="file-viewer">
            <template #header>
              <div class="file-header">
                <div class="file-title">
                  <span class="text-subtitle">{{ selectedFile.name }}</span>
                  <n-tag size="small" type="info">
                    {{ getFileTypeText(selectedFile) }}
                  </n-tag>
                </div>
                <div class="file-actions">
                  <n-space>
                    <!-- 编辑按钮（仅工作空间模板显示） -->
                    <n-button
                      v-if="canEdit && !isEditing"
                      @click="startEdit"
                      quaternary
                      size="tiny"
                      type="primary"
                    >
                      <template #icon>
                        <n-icon><Edit /></n-icon>
                      </template>
                      编辑
                    </n-button>

                    <!-- 编辑模式下的保存和取消按钮 -->
                    <template v-if="isEditing">
                      <n-button
                        @click="saveEdit"
                        size="tiny"
                        type="primary"
                        :loading="saving"
                      >
                        <template #icon>
                          <n-icon><Save /></n-icon>
                        </template>
                        保存
                      </n-button>
                      <n-button
                        @click="cancelEdit"
                        quaternary
                        size="tiny"
                      >
                        <template #icon>
                          <n-icon><Close /></n-icon>
                        </template>
                        取消
                      </n-button>
                    </template>

                    <n-button
                      @click="downloadFile"
                      quaternary
                      size="tiny"
                    >
                      <template #icon>
                        <n-icon><Download /></n-icon>
                      </template>
                      下载
                    </n-button>
                  </n-space>
                </div>
              </div>
            </template>

            <n-spin :show="loadingContent">
              <div v-if="selectedFile" class="file-content">
                <!-- 编辑模式 -->
                <div v-if="isEditing" class="editor-container">
                  <textarea
                    ref="editorRef"
                    v-model="editContent"
                    :disabled="saving"
                    placeholder="请输入文件内容..."
                    class="code-editor"
                    rows="25"
                  ></textarea>
                </div>
                <!-- 查看模式 -->
                <div v-else class="view-container">
                  <pre v-if="fileContent" class="code-view"><code :class="getLanguageClass(selectedFile)" v-html="highlightedContent"></code></pre>
                  <div v-else class="empty-content">
                    <p class="text-body">文件内容为空</p>
                  </div>
                </div>
              </div>
              <div v-else-if="!loadingContent" class="empty-content">
                <p class="text-body">请选择文件内容...</p>
              </div>
            </n-spin>
          </n-card>
        </n-layout-content>
      </n-layout>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage, useDialog } from 'naive-ui'
import { ArrowBack, Refresh, Document, Download, Create as Edit, Save, Close } from '@vicons/ionicons5'
import { appTemplateApi } from '@/api/template'
import { middlewareApi } from '@/api/middleware'
import type { TemplateFile } from '@/api/template'
import type { MiddlewareTemplate } from '@/types/middleware'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

// 路由参数
const templateName = computed(() => route.params.templateName as string)
const workspace = computed(() => route.params.workspaceName as string)
const source = computed(() => {
  // 根据路由名称判断模板来源
  const routeName = route.name as string
  return routeName.includes('Workspace') ? 'workspace' : 'global'
})
const templateType = computed(() => {
  // 根据路由名称判断模板类型
  const routeName = route.name as string
  return routeName.includes('App') ? 'app' : 'middleware'
})

// 响应式数据
const loading = ref(false)
const loadingContent = ref(false)
const files = ref<TemplateFile[]>([])
const selectedFile = ref<TemplateFile | null>(null)
const fileContent = ref('')
const templateInfo = ref<MiddlewareTemplate | null>(null)

// 编辑相关状态
const isEditing = ref(false)
const editContent = ref('')
const saving = ref(false)
const editorRef = ref<HTMLTextAreaElement>()

// 计算属性
const highlightedContent = computed(() => {
  if (!fileContent.value || !selectedFile.value) return ''

  const language = getLanguage(selectedFile.value)
  try {
    return hljs.highlight(fileContent.value, { language }).value
  } catch {
    return hljs.highlightAuto(fileContent.value).value
  }
})

// 是否可以编辑（只有工作空间模板才能编辑）
const canEdit = computed(() => {
  return source.value === 'workspace' && selectedFile.value?.type === 'file'
})

// 当前显示的内容（编辑模式下显示编辑内容，否则显示原内容）
const displayContent = computed(() => {
  return isEditing.value ? editContent.value : fileContent.value
})

// 方法
const goBack = () => {
  router.back()
}

const refreshFiles = async () => {
  await loadFiles()
}

const loadFiles = async () => {
  loading.value = true
  try {
    let response
    if (source.value === 'global') {
      if (templateType.value === 'app') {
        response = await appTemplateApi.getGlobalAppTemplateFiles(templateName.value)
      } else {
        response = await appTemplateApi.getGlobalTemplateFiles(templateName.value)
      }
    } else {
      // 工作空间模板
      if (templateType.value === 'app') {
        // 工作空间应用模板
        response = await appTemplateApi.getWorkspaceAppTemplateFiles(workspace.value, templateName.value)
      } else {
        // 工作空间中间件模板
        response = await middlewareApi.getTemplateFiles(workspace.value, templateName.value)
      }
    }
    files.value = response.data
  } catch (error: any) {
    message.error(error.message || '获取文件列表失败')
  } finally {
    loading.value = false
  }
}

const selectFile = async (file: TemplateFile) => {
  if (file.type === 'directory') {
    message.info('暂不支持查看目录')
    return
  }

  // 如果正在编辑，提示用户保存或取消
  if (isEditing.value) {
    const hasChanges = editContent.value !== fileContent.value
    if (hasChanges) {
      // 有未保存的更改，提示用户
      const confirmed = await new Promise<boolean>((resolve) => {
        dialog.warning({
          title: '未保存的更改',
          content: '当前文件有未保存的更改，切换文件将丢失这些更改。是否继续？',
          positiveText: '继续切换',
          negativeText: '取消',
          onPositiveClick: () => {
            resolve(true)
          },
          onNegativeClick: () => {
            resolve(false)
          }
        })
      })

      if (!confirmed) {
        return // 用户取消切换
      }
    }

    // 退出编辑模式
    isEditing.value = false
    editContent.value = ''
  }

  selectedFile.value = file
  await loadFileContent(file.name)
}

const loadFileContent = async (fileName: string) => {
  loadingContent.value = true
  try {
    console.log('加载文件内容:', {
      fileName,
      source: source.value,
      templateType: templateType.value,
      workspace: workspace.value,
      templateName: templateName.value
    })

    let response
    if (source.value === 'global') {
      if (templateType.value === 'app') {
        response = await appTemplateApi.getGlobalAppTemplateFileContent(templateName.value, fileName)
      } else {
        response = await appTemplateApi.getGlobalTemplateFileContent(templateName.value, fileName)
      }
    } else {
      // 工作空间模板
      if (templateType.value === 'app') {
        // 工作空间应用模板
        response = await appTemplateApi.getWorkspaceAppTemplateFileContent(workspace.value, templateName.value, fileName)
      } else {
        // 工作空间中间件模板
        response = await middlewareApi.getTemplateFileContent(workspace.value, templateName.value, fileName)
      }
    }

    console.log('API响应:', response)

    // 处理不同的响应格式
    if (response && response.data) {
      if (typeof response.data === 'string') {
        // 如果data直接是字符串内容
        fileContent.value = response.data
      } else if (response.data.content) {
        // 如果data是对象，包含content字段
        fileContent.value = response.data.content
      } else {
        console.warn('未知的响应格式:', response.data)
        fileContent.value = ''
      }
    } else {
      console.warn('响应数据为空:', response)
      fileContent.value = ''
    }

    console.log('文件内容已设置:', fileContent.value.substring(0, 100) + '...')
  } catch (error: any) {
    console.error('获取文件内容失败:', error)
    message.error(error.message || '获取文件内容失败')
    fileContent.value = ''
  } finally {
    loadingContent.value = false
  }
}

const downloadFile = () => {
  if (!selectedFile.value || !fileContent.value) return

  const blob = new Blob([fileContent.value], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = selectedFile.value.name
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 开始编辑
const startEdit = () => {
  if (!canEdit.value) return

  console.log('开始编辑:', {
    canEdit: canEdit.value,
    fileContent: fileContent.value.substring(0, 100) + '...',
    fileContentLength: fileContent.value.length
  })

  // 先设置编辑内容
  editContent.value = fileContent.value

  // 切换到编辑模式
  isEditing.value = true

  // 使用nextTick确保DOM更新后直接设置textarea的值
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.value = fileContent.value
      console.log('直接设置textarea值:', {
        textareaValue: editorRef.value.value.substring(0, 100) + '...',
        textareaValueLength: editorRef.value.value.length
      })
    }

    console.log('编辑内容已设置:', {
      editContent: editContent.value.substring(0, 100) + '...',
      editContentLength: editContent.value.length,
      isEditing: isEditing.value
    })
  })
}

// 取消编辑
const cancelEdit = () => {
  isEditing.value = false
  editContent.value = ''
}

// 保存编辑
const saveEdit = async () => {
  if (!selectedFile.value || !canEdit.value) return

  saving.value = true
  try {
    if (source.value === 'workspace') {
      if (templateType.value === 'app') {
        // 工作空间应用模板
        await appTemplateApi.updateWorkspaceAppTemplateFileContent(
          workspace.value,
          templateName.value,
          selectedFile.value.name,
          editContent.value
        )
      } else {
        // 工作空间中间件模板
        await middlewareApi.updateTemplateFileContent(
          workspace.value,
          templateName.value,
          selectedFile.value.name,
          editContent.value
        )
      }
    }

    // 更新本地内容
    fileContent.value = editContent.value
    isEditing.value = false
    editContent.value = ''
    message.success('文件保存成功')
  } catch (error: any) {
    message.error(error.message || '保存文件失败')
  } finally {
    saving.value = false
  }
}



const getFileTypeText = (file: TemplateFile): string => {
  if (file.type === 'directory') return '目录'
  
  const ext = file.extension?.toLowerCase()
  switch (ext) {
    case '.yaml':
    case '.yml':
      return 'YAML'
    case '.j2':
      return 'Jinja2 模板'
    case '.md':
      return 'Markdown'
    case '.sh':
      return 'Shell 脚本'
    case '.json':
      return 'JSON'
    default:
      return '文本文件'
  }
}

const getLanguage = (file: TemplateFile): string => {
  const ext = file.extension?.toLowerCase()
  switch (ext) {
    case '.yaml':
    case '.yml':
    case '.j2':
      return 'yaml'
    case '.md':
      return 'markdown'
    case '.sh':
      return 'bash'
    case '.json':
      return 'json'
    default:
      return 'text'
  }
}

const getLanguageClass = (file: TemplateFile): string => {
  return `language-${getLanguage(file)}`
}

const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

// 生命周期
onMounted(async () => {
  await loadFiles()
  
  // 尝试加载模板信息
  try {
    if (source.value === 'global') {
      // 全局模板暂时没有详情API，使用基本信息
      const templateDisplayName = templateName.value.charAt(0).toUpperCase() + templateName.value.slice(1)
      templateInfo.value = {
        name: templateDisplayName,
        description: `${templateDisplayName} 全局模板 - 系统提供的标准部署模板`,
        source: 'global'
      } as MiddlewareTemplate
    } else {
      // 工作空间模板
      if (templateType.value === 'app') {
        // 工作空间应用模板 - 暂时使用基本信息，因为还没有应用模板详情API
        templateInfo.value = {
          name: templateName.value,
          description: '工作空间应用模板',
          source: 'workspace'
        } as MiddlewareTemplate
      } else {
        // 工作空间中间件模板
        const response = await middlewareApi.getTemplate(workspace.value, templateName.value)
        templateInfo.value = response.data || response
      }
    }
  } catch (error) {
    console.warn('获取模板信息失败:', error)
  }
})
</script>

<style scoped>
.template-detail {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.header-section {
  flex-shrink: 0;
  margin-bottom: 16px;
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.back-button {
  flex-shrink: 0;
  margin-top: 4px;
}

.template-info {
  flex: 1;
}

.template-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.template-title h2 {
  margin: 0;
}

.template-description {
  color: var(--text-secondary);
  margin: 0;
}

.main-content {
  flex: 1;
  min-height: 0;
}

.file-sidebar {
  background: var(--n-color);
}

.file-list-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.file-list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  border-bottom: 1px solid var(--n-border-color);
}

.file-list-header h3 {
  margin: 0;
}

.file-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.file-item:hover {
  background-color: var(--n-color-hover);
}

.file-item.active {
  background-color: var(--n-color-pressed);
}

.file-item.editing {
  border-left: 3px solid #f0a020;
  background-color: rgba(240, 160, 32, 0.1);
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-weight: 500;
  margin-bottom: 2px;
  word-break: break-all;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.file-meta {
  color: var(--text-secondary);
  font-size: 12px;
}

.file-content-area {
  padding: 0;
}

.empty-state,
.file-viewer {
  height: 100%;
  margin: 0;
}

.empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--text-secondary);
}

.empty-content p {
  margin-top: 16px;
}

.file-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 按钮样式优化 */
.file-header :deep(.n-button) {
  padding: 4px 10px !important;
  min-height: 24px !important;
  line-height: 1.3 !important;
}

.file-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-content {
  max-height: calc(100vh - 300px);
  overflow: auto;
}

/* 查看模式样式 */
.view-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.code-view {
  flex: 1;
  margin: 0;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e0e0e0;
  overflow: auto;
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  box-sizing: border-box;
}

.file-content code {
  background: none;
  padding: 0;
  font-family: inherit;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 12px;
  }

  .template-title {
    flex-wrap: wrap;
  }

  .file-sidebar {
    width: 250px !important;
  }
}

/* 编辑器样式 */
.editor-container {
  width: 100%;
}

.code-editor {
  width: 100%;
  height: calc(100vh - 320px);
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.5;
  background: #f8f9fa;
  resize: vertical;
  outline: none;
  box-sizing: border-box;
}

.code-editor:focus {
  border-color: #007AFF;
  box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
}

.code-editor:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}
</style>
