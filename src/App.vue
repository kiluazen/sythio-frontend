<script setup lang="ts">
import { ref } from 'vue'
import Sidebar from './components/Sidebar.vue'

// Reference to sidebar component
const sidebarRef = ref<InstanceType<typeof Sidebar>>()

// Handle title updates from chat components
const handleTitleUpdated = (chatId: string, newTitle: string) => {
  // Update the sidebar chat list when a title is generated
  sidebarRef.value?.updateChatTitle(chatId, newTitle)
}

// Handle new chat creation
const handleNewChatCreated = (chatId: string) => {
  console.log('New chat created:', chatId)
}

// Handle chat selection
const handleChatSelected = (chatId: string) => {
  console.log('Chat selected:', chatId)
}
</script>

<template>
  <div class="min-h-screen flex">
    <!-- Sidebar -->
    <Sidebar 
      ref="sidebarRef"
      @new-chat-created="handleNewChatCreated"
      @chat-selected="handleChatSelected"
    />
    
    <!-- Main content area -->
    <div class="flex-1">
      <router-view @title-updated="handleTitleUpdated" />
    </div>
  </div>
</template>
