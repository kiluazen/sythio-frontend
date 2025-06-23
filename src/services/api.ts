// API service for Jarvis Chat
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'

export interface Chat {
  id: string
  title: string
  created_at: string
  updated_at: string
  user_id: string
}

export interface Message {
  id: string
  chat_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
  updated_at: string
  is_streaming: boolean
}

export interface ChatWithMessages extends Chat {
  messages: Message[]
}

export interface StreamToken {
  type: 'token' | 'complete' | 'error'
  content: string
  message_id?: string
}

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Network error' }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // ========================================
  // Chat Management
  // ========================================

  async getChats(): Promise<Chat[]> {
    return this.request<Chat[]>('/chats')
  }

  async createChat(title?: string): Promise<Chat> {
    return this.request<Chat>('/chats', {
      method: 'POST',
      body: JSON.stringify({ title: title || 'New Chat' }),
    })
  }

  async getChatWithMessages(chatId: string): Promise<ChatWithMessages> {
    return this.request<ChatWithMessages>(`/chats/${chatId}`)
  }

  async deleteChat(chatId: string): Promise<void> {
    await this.request(`/chats/${chatId}`, {
      method: 'DELETE',
    })
  }

  // ========================================
  // Messages
  // ========================================

  async getMessages(chatId: string): Promise<Message[]> {
    return this.request<Message[]>(`/chats/${chatId}/messages`)
  }

  // sendMessage method removed - we only support streaming responses now!

  // ========================================
  // Streaming (The Magic!)
  // ========================================

  async *streamMessage(
    chatId: string, 
    content: string
  ): AsyncGenerator<StreamToken, void, unknown> {
    const response = await fetch(`${API_BASE_URL}/chats/${chatId}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Network error' }))
      throw new Error(error.detail || `HTTP ${response.status}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        
        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              yield data as StreamToken
              
              if (data.type === 'complete' || data.type === 'error') {
                return
              }
            } catch (e) {
              console.warn('Failed to parse SSE data:', line)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  // ========================================
  // Health Check
  // ========================================

  async healthCheck(): Promise<{ status: string; message: string; version: string }> {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api'
    const healthUrl = baseUrl.replace('/api', '/health')
    const response = await fetch(healthUrl)
    return response.json()
  }
}

export const apiService = new ApiService()
export default apiService 