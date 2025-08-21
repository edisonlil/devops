<template>
  <div class="template-editor">
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      size="large"
    >
      <el-tabs v-model="activeTab">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="basic">
          <div class="form-grid">
            <el-form-item label="模板名称" prop="name">
              <el-input
                v-model="form.name"
                placeholder="请输入模板名称"
                :disabled="mode === 'view'"
              />
            </el-form-item>

            <el-form-item label="分类" prop="category">
              <el-select
                v-model="form.category"
                placeholder="请选择分类"
                :disabled="mode === 'view'"
                style="width: 100%"
              >
                <el-option label="后端服务" value="backend" />
                <el-option label="前端应用" value="frontend" />
              </el-select>
            </el-form-item>

            <el-form-item label="图标" prop="icon">
              <el-select
                v-model="form.icon"
                placeholder="请选择图标"
                :disabled="mode === 'view'"
                style="width: 100%"
              >
                <el-option label="Box" value="Box" />
                <el-option label="Coffee" value="Coffee" />
                <el-option label="Monitor" value="Monitor" />
                <el-option label="Lightning" value="Lightning" />
                <el-option label="Snake" value="Snake" />
                <el-option label="Database" value="Database" />
                <el-option label="Tools" value="Tools" />
              </el-select>
            </el-form-item>

            <el-form-item label="模板范围" prop="scope">
              <el-radio-group v-model="form.scope" :disabled="mode === 'view'">
                <el-radio label="global">全局模板</el-radio>
                <el-radio label="workspace">工作空间模板</el-radio>
              </el-radio-group>
            </el-form-item>
          </div>

          <el-form-item label="描述" prop="description">
            <el-input
              v-model="form.description"
              type="textarea"
              :rows="3"
              placeholder="请输入模板描述"
              :disabled="mode === 'view'"
            />
          </el-form-item>

          <div class="form-grid">
            <el-form-item label="标签">
              <el-select
                v-model="form.tags"
                multiple
                filterable
                allow-create
                placeholder="请输入标签"
                :disabled="mode === 'view'"
                style="width: 100%"
              >
                <el-option
                  v-for="tag in commonTags"
                  :key="tag"
                  :label="tag"
                  :value="tag"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="版本">
              <el-select
                v-model="form.versions"
                multiple
                filterable
                allow-create
                placeholder="请输入版本号"
                :disabled="mode === 'view'"
                style="width: 100%"
              >
              </el-select>
            </el-form-item>
          </div>

          <div class="form-grid">
            <el-form-item label="默认版本" prop="defaultVersion">
              <el-input
                v-model="form.defaultVersion"
                placeholder="请输入默认版本"
                :disabled="mode === 'view'"
              />
            </el-form-item>

            <el-form-item label="支持平台" prop="platformTypes">
              <el-checkbox-group v-model="form.platformTypes" :disabled="mode === 'view'">
                <el-checkbox label="KUBERNETES">Kubernetes</el-checkbox>
                <el-checkbox label="DOCKER_SWARM">Docker Swarm</el-checkbox>
                <el-checkbox label="DOCKER_COMPOSE">Docker Compose</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </div>
        </el-tab-pane>

        <!-- Dockerfile -->
        <el-tab-pane label="Dockerfile" name="dockerfile">
          <el-form-item label="Dockerfile 内容">
            <Codemirror
              v-model="form.dockerfile"
              :extensions="[StreamLanguage.define(dockerFile)]"
              :disabled="mode === 'view'"
              style="height: 400px"
            />
          </el-form-item>
        </el-tab-pane>

        <!-- 构建命令 -->
        <el-tab-pane label="构建命令" name="build">
          <div class="build-commands">
            <div class="commands-header">
              <h3>构建命令</h3>
              <el-button
                v-if="mode !== 'view'"
                type="primary"
                text
                @click="addBuildCommand"
              >
                <el-icon><Plus /></el-icon>
                添加命令
              </el-button>
            </div>

            <div class="commands-list">
              <div
                v-for="(command, index) in form.buildCommands"
                :key="index"
                class="command-item"
              >
                <el-input
                  v-model="form.buildCommands[index]"
                  placeholder="请输入构建命令"
                  :disabled="mode === 'view'"
                />
                <el-button
                  v-if="mode !== 'view'"
                  type="danger"
                  text
                  @click="removeBuildCommand(index)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- 默认参数 -->
        <el-tab-pane label="默认参数" name="params">
          <div class="default-params">
            <div class="params-header">
              <h3>默认参数</h3>
              <el-button
                v-if="mode !== 'view'"
                type="primary"
                text
                @click="addDefaultParam"
              >
                <el-icon><Plus /></el-icon>
                添加参数
              </el-button>
            </div>

            <div class="params-list">
              <div
                v-for="(param, index) in form.defaultParams"
                :key="index"
                class="param-item"
              >
                <el-input
                  v-model="param.key"
                  placeholder="参数名"
                  :disabled="mode === 'view'"
                  class="param-key"
                />
                <el-input
                  v-model="param.value"
                  placeholder="默认值"
                  :disabled="mode === 'view'"
                  class="param-value"
                />
                <el-input
                  v-model="param.description"
                  placeholder="参数描述"
                  :disabled="mode === 'view'"
                  class="param-desc"
                />
                <el-button
                  v-if="mode !== 'view'"
                  type="danger"
                  text
                  @click="removeDefaultParam(index)"
                >
                  <el-icon><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-form>

    <!-- 操作按钮 -->
    <div class="editor-actions" v-if="mode !== 'view'">
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleSave" :loading="saving">
        {{ mode === 'create' ? '创建' : '保存' }}
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, watch, onMounted } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { StreamLanguage } from '@codemirror/language'
import { dockerFile } from '@codemirror/legacy-modes/mode/dockerfile'

const props = defineProps({
  mode: {
    type: String,
    default: 'view' // 'view', 'edit', 'create'
  },
  template: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['save', 'cancel'])

// 响应式数据
const formRef = ref()
const activeTab = ref('basic')
const saving = ref(false)

const form = reactive({
  name: '',
  description: '',
  category: '',
  icon: 'Box',
  tags: [],
  versions: [],
  defaultVersion: '',
  platformTypes: [],
  scope: 'global',
  dockerfile: '',
  buildCommands: [],
  defaultParams: []
})

const commonTags = [
  'Java', 'Spring Boot', 'Maven', 'Gradle',
  'Vue.js', 'React', 'Angular', 'TypeScript', 'JavaScript',
  'Go', 'Gin', 'Echo',
  'Python', 'Django', 'Flask', 'FastAPI',
  'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
  'Docker', 'Kubernetes', 'API', 'Web', 'Database'
]

const rules = {
  name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择分类', trigger: 'change' }
  ],
  platformTypes: [
    { required: true, message: '请选择支持的平台类型', trigger: 'change' }
  ]
}

// 方法
const initForm = () => {
  if (props.template) {
    Object.assign(form, {
      name: props.template.name || '',
      description: props.template.description || '',
      category: props.template.category || '',
      icon: props.template.icon || 'Box',
      tags: props.template.tags || [],
      versions: props.template.versions || [],
      defaultVersion: props.template.defaultVersion || '',
      platformTypes: props.template.platformTypes || [],
      scope: props.template.scope || 'global',
      dockerfile: props.template.dockerfile || '',
      buildCommands: props.template.buildCommands || [],
      defaultParams: props.template.defaultParams || []
    })
  } else {
    // 重置表单
    Object.assign(form, {
      name: '',
      description: '',
      category: '',
      icon: 'Box',
      tags: [],
      versions: [],
      defaultVersion: '',
      platformTypes: [],
      scope: 'global',
      dockerfile: '',
      buildCommands: [],
      defaultParams: []
    })
  }
}

const addBuildCommand = () => {
  form.buildCommands.push('')
}

const removeBuildCommand = (index) => {
  form.buildCommands.splice(index, 1)
}

const addDefaultParam = () => {
  form.defaultParams.push({
    key: '',
    value: '',
    description: ''
  })
}

const removeDefaultParam = (index) => {
  form.defaultParams.splice(index, 1)
}

const handleSave = async () => {
  try {
    await formRef.value.validate()

    saving.value = true

    const templateData = {
      ...form,
      defaultParams: form.defaultParams.filter(p => p.key && p.value),
      buildCommands: form.buildCommands.filter(c => c.trim())
    }

    emit('save', templateData)
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    saving.value = false
  }
}

const handleCancel = () => {
  emit('cancel')
}

// 监听模板变化
watch(() => props.template, initForm, { immediate: true })

// 生命周期
onMounted(() => {
  initForm()
})
</script>

<style scoped>
.template-editor {
  padding: 20px 0;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.code-editor {
  font-family: 'Courier New', monospace;
}

.commands-header,
.params-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.commands-header h3,
.params-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}



.command-item,
.param-item {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.param-key {
  flex: 1;
}

.param-value {
  flex: 1;
}

.param-desc {
  flex: 2;
}

.editor-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #e5e7eb;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #374151;
}

:deep(.el-tabs__item) {
  font-weight: 500;
}

:deep(.el-textarea__inner) {
  font-family: 'Courier New', monospace;
}
</style>
