<template>
  <div class="w-64 bg-gray-100 border-r border-gray-200 h-screen flex flex-col">
    <!-- Top row: Logo with close icon -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100">
      <img class="h-8 w-auto" src="../assets/logo.webp" alt="SynthioLabs">
      <button class="p-1 hover:bg-gray-100 rounded">
        <img class="w-5 h-5" src="../assets/close_sidebar.svg" alt="Close sidebar">
      </button>
    </div>
    
    <!-- Sidebar items -->
    <div class="flex flex-col py-2 flex-1 overflow-hidden">
      <!-- Jarvis Assist - Create New Chat -->
      <button 
        @click="createNewChat"
        class="flex items-center mx-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-colors"
        :class="{ 'bg-white shadow-sm': !currentChatId }"
        :disabled="isCreatingChat"
      >
        <img class="w-5 h-5 mr-3" src="../assets/assistant.svg" alt="Assistant">
        <span v-if="isCreatingChat">Creating...</span>
        <span v-else>Jarvis Assistant</span>
      </button>

      <!-- Chat History Section -->
      <div class="mt-4 flex-1 overflow-hidden">
        <div class="px-4 py-1">
          <h3 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recent Chats</h3>
        </div>
        
        <!-- Chat List -->
        <div class="flex-1 overflow-y-auto px-2 space-y-1">
          <button
            v-for="chat in chats"
            :key="chat.id"
            @click="selectChat(chat.id)"
            class="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-white hover:shadow-sm rounded-lg transition-colors block"
            :class="{ 'bg-white shadow-sm text-blue-600': currentChatId === chat.id }"
          >
            <div class="truncate font-medium">{{ chat.title }}</div>
            <div class="truncate text-xs text-gray-500 mt-1">
              {{ formatDate(chat.updated_at) }}
            </div>
          </button>
          
          <!-- Loading state -->
          <div v-if="isLoadingChats" class="px-3 py-2 text-sm text-gray-500">
            Loading chats...
          </div>
          
          <!-- Empty state -->
          <div v-if="!isLoadingChats && chats.length === 0" class="px-3 py-2 text-sm text-gray-500">
            No chats yet. Start by clicking "Jarvis Assistant" above.
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import apiService, { type Chat } from '@/services/api'

const router = useRouter()
const route = useRoute()

// Define emits
const emit = defineEmits<{
  'chat-selected': [chatId: string]
  'new-chat-created': [chatId: string]
}>()

// Reactive state
const chats = ref<Chat[]>([])
const isLoadingChats = ref(false)
const isCreatingChat = ref(false)

// Get current chat ID from route params
const currentChatId = computed(() => route.params.chatId as string || null)

// Load chats on mount
onMounted(async () => {
  await loadChats()
})

// Load all chats
const loadChats = async () => {
  try {
    isLoadingChats.value = true
    chats.value = await apiService.getChats()
  } catch (error) {
    console.error('Failed to load chats:', error)
  } finally {
    isLoadingChats.value = false
  }
}

// Create new chat
const createNewChat = async () => {
  try {
    isCreatingChat.value = true
    const newChat = await apiService.createChat()
    
    // Add to beginning of chat list
    chats.value.unshift(newChat)
    
    // Navigate to the new chat
    router.push(`/chat/${newChat.id}`)
    
    // Emit event for parent components
    emit('new-chat-created', newChat.id)
    
  } catch (error) {
    console.error('Failed to create new chat:', error)
    alert('Failed to create new chat. Please try again.')
  } finally {
    isCreatingChat.value = false
  }
}

// Select existing chat
const selectChat = (chatId: string) => {
  router.push(`/chat/${chatId}`)
  emit('chat-selected', chatId)
}

// Format date for display
const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInHours = diffInMs / (1000 * 60 * 60)
  
  if (diffInHours < 1) {
    return 'Just now'
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}h ago`
  } else if (diffInHours < 24 * 7) {
    return `${Math.floor(diffInHours / 24)}d ago`
  } else {
    return date.toLocaleDateString()
  }
}

// Refresh chats (can be called from parent)
const refreshChats = async () => {
  await loadChats()
}

// Update chat title when it changes (called from parent when title is generated)
const updateChatTitle = (chatId: string, newTitle: string) => {
  const chatIndex = chats.value.findIndex(chat => chat.id === chatId)
  if (chatIndex !== -1) {
    chats.value[chatIndex].title = newTitle
    // Move to top of list since it was just updated
    const updatedChat = chats.value.splice(chatIndex, 1)[0]
    updatedChat.updated_at = new Date().toISOString()
    chats.value.unshift(updatedChat)
  }
}

// Expose methods for parent components
defineExpose({
  refreshChats,
  updateChatTitle
})
</script> 