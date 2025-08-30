<template>
  <div class="bottom-toolbar">
    <div class="toolbar-container">
      <div class="toolbar-item" @click="handleTickets">
        <svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
        <span class="toolbar-label">工单</span>
      </div>
      
      <div class="toolbar-item" @click="handleDocs">
        <svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
          <path d="M8 7h8"/>
          <path d="M8 11h8"/>
          <path d="M8 15h6"/>
        </svg>
        <span class="toolbar-label">文档</span>
      </div>
      
      <div class="toolbar-item" @click="handleSettings">
        <svg class="toolbar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"/>
        </svg>
        <span class="toolbar-label">设置</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  tickets: []
  docs: []
  settings: []
}>()

const handleTickets = () => {
  emit('tickets')
}

const handleDocs = () => {
  emit('docs')
}

const handleSettings = () => {
  emit('settings')
}
</script>

<style scoped>
.bottom-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  border-top: 1px solid #f0f0f0;
  z-index: 100;
  backdrop-filter: blur(8px);
}

.toolbar-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 48px;
  padding: 12px 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.toolbar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 60px;
}

.toolbar-item:hover {
  background: #f5f5f5;
}

.toolbar-icon {
  width: 20px;
  height: 20px;
  color: #595959;
  transition: color 0.2s ease;
}

.toolbar-item:hover .toolbar-icon {
  color: #1890ff;
}

.toolbar-label {
  font-size: 12px;
  color: #595959;
  font-weight: 500;
  transition: color 0.2s ease;
}

.toolbar-item:hover .toolbar-label {
  color: #1890ff;
}

@media (max-width: 768px) {
  .toolbar-container {
    gap: 24px;
    padding: 10px 16px;
  }
  
  .toolbar-item {
    padding: 6px 12px;
    min-width: 50px;
  }
  
  .toolbar-icon {
    width: 18px;
    height: 18px;
  }
  
  .toolbar-label {
    font-size: 11px;
  }
}
</style>
