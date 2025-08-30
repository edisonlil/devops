<template>
  <div class="professional-logo">
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#1890ff"/>
      <path d="M7 12L10 15L17 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="18" cy="6" r="2" fill="#52c41a"/>
    </svg>
    <span class="logo-text">DevOps Cloud</span>
  </div>
</template>

<script setup lang="ts">
// Professional DevOps logo component
</script>

<style scoped>
.professional-logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-text {
  font-size: 16px;
  font-weight: 600;
  color: #262626;
  letter-spacing: -0.02em;
}

@media (max-width: 768px) {
  .professional-logo svg {
    width: 20px;
    height: 20px;
  }
  
  .logo-text {
    font-size: 15px;
  }
}
</style>
