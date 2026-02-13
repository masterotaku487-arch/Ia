'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Paperclip, Plus, MessageSquare, Settings, Moon, Sun } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'

// ============================================================================
// TIPOS
// ============================================================================

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function GenyxAIChat() {
  // Estados
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sessions, setSessions] = useState<ChatSession[]>([
    {
      id: '1',
      title: 'Nova Conversa',
      messages: [],
      createdAt: new Date()
    }
  ])
  const [currentSessionId, setCurrentSessionId] = useState('1')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll para última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // ============================================================================
  // FUNÇÃO DE CHAMADA À API
  // ============================================================================

  const sendMessage = async (userMessage: string) => {
    if (!userMessage.trim() || isLoading) return

    // Adiciona mensagem do usuário
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newUserMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Chamada à API do Hugging Face
      const response = await fetch('https://router.huggingface.co/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_HF_TOKEN}`
        },
        body: JSON.stringify({
          model: 'Qwen/Qwen2.5-7B-Instruct',
          messages: [
            {
              role: 'system',
              content: 'You are GENYX AI, a helpful and intelligent assistant. You provide clear, accurate, and professional responses.'
            },
            ...messages.map(m => ({
              role: m.role,
              content: m.content
            })),
            {
              role: 'user',
              content: userMessage
            }
          ],
          max_tokens: 1000,
          temperature: 0.7,
          stream: false
        })
      })

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`)
      }

      const data = await response.json()
      const aiResponse = data.choices[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.'

      // Adiciona resposta da IA
      const newAIMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, newAIMessage])

    } catch (error) {
      console.error('Erro ao chamar API:', error)
      
      // Mensagem de erro
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '❌ Desculpe, ocorreu um erro ao processar sua mensagem. Verifique sua conexão e tente novamente.',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  // Handlers
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const createNewChat = () => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'Nova Conversa',
      messages: [],
      createdAt: new Date()
    }
    setSessions(prev => [newSession, ...prev])
    setCurrentSessionId(newSession.id)
    setMessages([])
  }

  // ============================================================================
  // COMPONENTE DE MENSAGEM COM MARKDOWN
  // ============================================================================

  const MessageBubble = ({ message }: { message: Message }) => {
    const isUser = message.role === 'user'

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`}>
        <div
          className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-3 ${
            isUser
              ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/50'
              : 'bg-gray-800 text-gray-100 border border-gray-700'
          }`}
        >
          {/* Avatar/Label */}
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              isUser ? 'bg-blue-700' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
            }`}>
              {isUser ? 'U' : 'G'}
            </div>
            <span className="text-xs font-semibold opacity-80">
              {isUser ? 'Você' : 'GENYX AI'}
            </span>
          </div>

          {/* Conteúdo com Markdown */}
          <div className={`prose ${isUser ? 'prose-invert' : 'prose-invert'} max-w-none`}>
            <ReactMarkdown
              components={{
                code(props: any) {
                  const { inline, className, children, ...rest } = props
                  const match = /language-(\w+)/.exec(className || '')
                  return !inline && match ? (
                    <SyntaxHighlighter
                      {...rest}
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      className="rounded-lg text-sm"
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code {...rest} className={className || 'bg-gray-900 px-1.5 py-0.5 rounded text-sm'}>
                      {children}
                    </code>
                  )
                }
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>

          {/* Timestamp */}
          <div className="text-xs opacity-50 mt-2">
            {message.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    )
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex h-screen bg-black text-gray-100 overflow-hidden">
      
      {/* ========== SIDEBAR ========== */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-gray-950 border-r border-gray-800 flex flex-col transition-all duration-300 ease-in-out overflow-hidden`}
      >
        {/* Header Sidebar */}
        <div className="p-4 border-b border-gray-800">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-lg px-4 py-3 font-semibold transition-all shadow-lg shadow-blue-500/30"
          >
            <Plus size={20} />
            Nova Conversa
          </button>
        </div>

        {/* Histórico de Sessões */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sessions.map(session => (
            <button
              key={session.id}
              onClick={() => {
                setCurrentSessionId(session.id)
                setMessages(session.messages)
              }}
              className={`w-full text-left px-3 py-2 rounded-lg transition-all ${
                currentSessionId === session.id
                  ? 'bg-blue-600/20 border border-blue-500/50 text-blue-400'
                  : 'hover:bg-gray-800 text-gray-400'
              }`}
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={16} />
                <span className="text-sm truncate">{session.title}</span>
              </div>
              <div className="text-xs opacity-50 mt-1">
                {session.createdAt.toLocaleDateString('pt-BR')}
              </div>
            </button>
          ))}
        </div>

        {/* Footer Sidebar */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-800 rounded-lg transition-all text-sm text-gray-400">
            <Settings size={16} />
            Configurações
          </button>
        </div>
      </aside>

      {/* ========== ÁREA PRINCIPAL ========== */}
      <main className="flex-1 flex flex-col">
        
        {/* Header */}
        <header className="h-16 bg-gradient-to-r from-gray-950 to-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shadow-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-all"
            >
              <MessageSquare size={20} />
            </button>
            
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                GENYX AI
              </h1>
              <p className="text-xs text-gray-500">Powered by Qwen 2.5</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Online</span>
          </div>
        </header>

        {/* Área de Mensagens */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-black to-gray-950">
          {messages.length === 0 ? (
            // Estado vazio
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/50">
                  <MessageSquare size={40} className="text-white" />
                </div>
                <h2 className="text-3xl font-bold mb-3 bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                  Olá! Sou GENYX AI
                </h2>
                <p className="text-gray-400 mb-6">
                  Como posso ajudar você hoje? Digite sua mensagem abaixo para começar.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {[
                    '💡 Explicar conceitos',
                    '📝 Escrever código',
                    '🧠 Resolver problemas',
                    '🔍 Pesquisar informações'
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 hover:border-blue-500/50 transition-all cursor-pointer"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            // Mensagens
            <div className="max-w-4xl mx-auto">
              {messages.map(message => (
                <MessageBubble key={message.id} message={message} />
              ))}
              
              {/* Indicador de carregamento */}
              {isLoading && (
                <div className="flex justify-start mb-4">
                  <div className="bg-gray-800 border border-gray-700 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Fixo */}
        <footer className="bg-gray-950 border-t border-gray-800 p-4 shadow-2xl">
          <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              
              {/* Botão Anexo */}
              <button
                type="button"
                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-all text-gray-400 hover:text-gray-200"
              >
                <Paperclip size={20} />
              </button>

              {/* Textarea */}
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem..."
                  rows={1}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none max-h-32"
                  disabled={isLoading}
                />
              </div>

              {/* Botão Enviar */}
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className={`p-3 rounded-xl transition-all ${
                  input.trim() && !isLoading
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Send size={20} />
              </button>
            </form>
            
            <p className="text-xs text-gray-600 text-center mt-3">
              GENYX AI pode cometer erros. Verifique informações importantes.
            </p>
          </div>
        </footer>
      </main>
    </div>
  )
}
