<template>
  <div class="config-editor">
    <div class="editor-header">
      <div class="platform-info">
        <n-tag :type="platformTagType" size="small">
          {{ platformDisplayName }}
        </n-tag>
        <span class="syntax-info">{{ syntaxInfo }}</span>
      </div>
    </div>

    <vue-monaco-editor
      :value="modelValue"
      :language="language"
      :theme="theme"
      :options="editorOptions"
      :height="height"
      @mount="handleEditorMount"
      @update:value="$emit('update:modelValue', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'

interface Props {
  modelValue: string
  platform?: string
  height?: string | number
  theme?: string
}

interface Emits {
  (e: 'update:modelValue', value: string): void
}

const props = withDefaults(defineProps<Props>(), {
  platform: 'kubernetes',
  height: '400px',
  theme: 'vs-dark'
})

const emit = defineEmits<Emits>()

// 编辑器实例
const editorInstance = ref()

// 根据平台确定语言模式
const language = computed(() => {
  // 所有平台都使用YAML，但会有不同的补全规则
  return 'yaml'
})

// 平台显示信息
const platformDisplayName = computed(() => {
  switch (props.platform) {
    case 'kubernetes':
      return 'Kubernetes'
    case 'docker-compose':
      return 'Docker Compose'
    default:
      return 'YAML'
  }
})

const platformTagType = computed(() => {
  switch (props.platform) {
    case 'kubernetes':
      return 'info'
    case 'docker-compose':
      return 'success'
    default:
      return 'default'
  }
})

const syntaxInfo = computed(() => {
  switch (props.platform) {
    case 'kubernetes':
      return 'K8s YAML 配置文件'
    case 'docker-compose':
      return 'Docker Compose 配置文件'
    default:
      return 'YAML 配置文件'
  }
})

// 编辑器配置
const editorOptions = computed(() => ({
  automaticLayout: true,
  formatOnType: true,
  formatOnPaste: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: 'on' as const,
  lineNumbers: 'on' as const,
  glyphMargin: false,
  folding: true,
  lineDecorationsWidth: 10,
  lineNumbersMinChars: 3,
  fontSize: 14,
  fontFamily: 'Consolas, "Courier New", monospace',
  tabSize: 2,
  insertSpaces: true,
  detectIndentation: false,
  renderWhitespace: 'boundary' as const,
  suggest: {
    showKeywords: true,
    showSnippets: true,
    showFunctions: true,
    showConstructors: true,
    showFields: true,
    showVariables: true,
    showClasses: true,
    showStructs: true,
    showInterfaces: true,
    showModules: true,
    showProperties: true,
    showEvents: true,
    showOperators: true,
    showUnits: true,
    showValues: true,
    showConstants: true,
    showEnums: true,
    showEnumMembers: true,
    showColors: true,
    showFiles: true,
    showReferences: true,
    showFolders: true,
    showTypeParameters: true,
    showIssues: true,
    showUsers: true,
    showWords: true
  }
}))

// 编辑器挂载时的处理
const handleEditorMount = (editor: any) => {
  editorInstance.value = editor
  console.log('Monaco Editor mounted for platform:', props.platform)
}
</script>

<style scoped>
.config-editor {
  border: 1px solid var(--border-color);
  border-radius: 6px;
  overflow: hidden;
}

.editor-header {
  background: var(--card-color);
  border-bottom: 1px solid var(--border-color);
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.platform-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.syntax-info {
  font-size: 12px;
  color: var(--text-color-3);
}
</style>
