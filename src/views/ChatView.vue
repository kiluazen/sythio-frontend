<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import apiService, { type Message, type Chat } from '@/services/api'

const route = useRoute()

// Props and emits
const emit = defineEmits<{
  'title-updated': [chatId: string, title: string]
}>()

// Reactive state
const inputMessage = ref('')
const isLoading = ref(false)
const isStreaming = ref(false)
const currentChat = ref<Chat | null>(null)
const messages = ref<Message[]>([])

// Auto-resize textarea
const textarea = ref<HTMLTextAreaElement>()
const messagesContainer = ref<HTMLDivElement>()

// Get chat ID from route
const chatId = computed(() => route.params.chatId as string)

// Load chat data
const loadChat = async (id: string) => {
  try {
    isLoading.value = true
    const chat = await apiService.getChatWithMessages(id)
    
    if (chat) {
      currentChat.value = chat
      messages.value = chat.messages || []
      
      // Scroll to bottom after loading messages
      await nextTick()
      scrollToBottom()
    }
  } catch (error) {
    console.error('Failed to load chat:', error)
    alert('Failed to load chat')
  } finally {
    isLoading.value = false
  }
}

// Watch for route changes
watch(() => route.params.chatId, async (newChatId) => {
  if (newChatId) {
    await loadChat(newChatId as string)
  }
}, { immediate: true })

// Handle message submission with streaming
const handleSubmit = async () => {
  if (!inputMessage.value.trim() || isLoading.value || isStreaming.value || !currentChat.value) {
    return
  }

  const content = inputMessage.value.trim()
  inputMessage.value = ''
  isLoading.value = true
  isStreaming.value = true

  // Check if this is the first message
  const isFirstMessage = messages.value.length === 0

  try {
    // Add user message to UI immediately
    const userMessage: Message = {
      id: crypto.randomUUID(),
      chat_id: currentChat.value.id,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_streaming: false
    }
    messages.value.push(userMessage)

    // Add assistant placeholder
    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      chat_id: currentChat.value.id,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_streaming: true
    }
    messages.value.push(assistantMessage)

    // Get the reactive proxy that Vue stored in the array
    const reactiveAssistantMessage = messages.value[messages.value.length - 1]

    // Scroll to show new messages
    await nextTick()
    scrollToBottom()

    let accumulatedContent = ''

    try {
      for await (const token of apiService.streamMessage(currentChat.value.id, content)) {
        if (token.type === 'token') {
          accumulatedContent += token.content
          
          // Update the reactive assistant message so the DOM refreshes in real-time
          reactiveAssistantMessage.content = accumulatedContent
          reactiveAssistantMessage.id = token.message_id || reactiveAssistantMessage.id
          
          // Wait for the DOM to paint before auto-scrolling
          await nextTick()
          scrollToBottom()
        } else if (token.type === 'complete') {
          reactiveAssistantMessage.is_streaming = false
          reactiveAssistantMessage.id = token.message_id || reactiveAssistantMessage.id
          break
        } else if (token.type === 'error') {
          reactiveAssistantMessage.content = token.content
          reactiveAssistantMessage.is_streaming = false
          break
        }
      }
    } catch (streamError) {
      console.error('Streaming error:', streamError)
      reactiveAssistantMessage.content = 'Sorry, I encountered an error while responding.'
      reactiveAssistantMessage.is_streaming = false
    }

    isStreaming.value = false

    // If this was the first message, wait a bit for title generation and refresh chat
    if (isFirstMessage) {
      setTimeout(async () => {
        try {
          const updatedChat = await apiService.getChatWithMessages(currentChat.value!.id)
          if (updatedChat.title !== currentChat.value!.title) {
            currentChat.value!.title = updatedChat.title
            emit('title-updated', currentChat.value!.id, updatedChat.title)
          }
        } catch (error) {
          console.error('Failed to refresh chat title:', error)
        }
      }, 2000)
    }

  } catch (error) {
    console.error('Failed to send message:', error)
    // Remove the user message we added optimistically
    if (messages.value.length > 0 && messages.value[messages.value.length - 2]?.role === 'user') {
      messages.value.splice(-2, 2) // Remove both user and assistant messages
    }
    
    alert(`Failed to send message: ${error}`)
  } finally {
    isLoading.value = false
  }
}

// Scroll to bottom of chat
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

// Handle keyboard shortcuts
const handleKeyPress = (event: KeyboardEvent) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault()
    handleSubmit()
  }
}

// Auto-resize textarea
const adjustTextareaHeight = () => {
  if (textarea.value) {
    textarea.value.style.height = 'auto'
    textarea.value.style.height = Math.min(textarea.value.scrollHeight, 200) + 'px'
  }
}

// Initialize
onMounted(() => {
  // Test API connection
  apiService.healthCheck()
    .then(health => {
      console.log('🚀 Backend connected:', health)
    })
    .catch(error => {
      console.error('❌ Backend connection failed:', error)
    })
})
</script>

<template>
  <main class="h-screen flex flex-col">
    <!-- Chat Messages Area -->
    <div v-if="messages.length > 0" class="flex-1 overflow-y-auto px-4 py-6" ref="messagesContainer">
      <div class="max-w-4xl mx-auto space-y-6">
        <div
          v-for="message in messages"
          :key="message.id"
          class="flex"
          :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="max-w-3xl rounded-lg px-6 py-4"
            :class="message.role === 'user' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-900'"
          >
            <!-- User Message -->
            <div v-if="message.role === 'user'" class="whitespace-pre-wrap">
              {{ message.content }}
            </div>
            
            <!-- Assistant Message -->
            <div v-else class="space-y-2">
              <div class="whitespace-pre-wrap">{{ message.content }}</div>
              
              <!-- Streaming indicator -->
              <div v-if="message.is_streaming" class="flex items-center space-x-2 text-gray-500">
                <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                <span class="text-sm">Jarvis is thinking...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Welcome Screen (when no messages) -->
    <div v-else class="flex-1 flex items-center justify-center px-8">
      <div class="max-w-2xl w-full text-center">
        <h1 class="text-3xl font-bold text-gray-900 mb-8">
          {{ currentChat?.title || 'New Chat' }}
        </h1>
        
        <div class="text-gray-600 mb-8">
          <p>I'm Jarvis, your AI assistant. I can help you with:</p>
          <ul class="mt-4 space-y-2 text-left max-w-md mx-auto">
            <li>• Programming questions and code review</li>
            <li>• Technical discussions and explanations</li>
            <li>• Problem-solving and brainstorming</li>
            <li>• General knowledge and research</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Input Area (Fixed at bottom) -->
    <div class="border-t bg-white p-4">
      <div class="max-w-4xl mx-auto">
        <div class="relative">
          <!-- Text input area -->
          <textarea
            ref="textarea"
            v-model="inputMessage"
            @keypress="handleKeyPress"
            @input="adjustTextareaHeight"
            placeholder="Ask anything..."
            class="w-full resize-none border border-gray-300 rounded-xl shadow-sm bg-white p-4 pr-20 pb-16 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            :disabled="isLoading || isStreaming"
            rows="1"
            style="min-height: 56px; max-height: 200px;"
          />

          <!-- Left-side action buttons -->
          <div class="absolute bottom-4 left-4 flex items-center space-x-4">
            <button
              type="button"
              class="flex items-center space-x-2 text-sm text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
              :disabled="isLoading || isStreaming"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span>Attach</span>
            </button>

            <button
              type="button"
              class="flex items-center space-x-2 text-sm text-gray-600 hover:text-blue-600 transition-colors disabled:opacity-50"
              :disabled="isLoading || isStreaming"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>Post call</span>
            </button>
          </div>

          <!-- Right-side action buttons -->
          <div class="absolute bottom-4 right-4 flex items-center space-x-4">
            <!-- Loading indicator -->
            <div v-if="isLoading || isStreaming" class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
            
            <!-- Send button -->
            <button
              type="button"
              @click="handleSubmit"
              :disabled="!inputMessage.trim() || isLoading || isStreaming"
              class="p-2 text-gray-500 hover:text-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="text-center py-4 text-xs text-gray-500 bg-gray-50">
      <p>By messaging Jarvis AI, you agree to our <span class="underline cursor-pointer">Terms</span> and have read our <span class="underline cursor-pointer">Privacy Policy</span></p>
      <p class="mt-1">Made with ❤️ for SynthioLabs Interview</p>
    </div>
  </main>
</template> 