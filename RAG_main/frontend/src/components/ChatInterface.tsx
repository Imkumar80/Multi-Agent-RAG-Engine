import { useState, useRef, useEffect } from 'react'
import { Send, User, Sparkles, StopCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export type Message = {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

type ChatInterfaceProps = {
    messages: Message[]
    isProcessing: boolean
    onSendMessage: (content: string) => void
}

export default function ChatInterface({
    messages,
    isProcessing,
    onSendMessage
}: ChatInterfaceProps) {
    const { avatarUrl } = useAuth()
    const [input, setInput] = useState('')
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const textareaRef = useRef<HTMLTextAreaElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isProcessing])

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
        }
    }, [input])

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!input.trim() || isProcessing) return

        onSendMessage(input)
        setInput('')
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSubmit()
        }
    }

    return (
        <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-white relative">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pb-32 pt-4">
                {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-500">
                        <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                            <Sparkles className="h-8 w-8 text-primary" />
                        </div>
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Resonav AI Researcher</h2>
                        <p className="max-w-md">
                            Ask me anything about your research, documents, or data. I can help synthesize information and find relevant papers.
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 max-w-2xl w-full">
                            {['Summarize my latest findings', 'Find papers on quantum ML', 'Analyze the PDF I uploaded', 'Draft an abstract'].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    onClick={() => onSendMessage(suggestion)}
                                    className="p-3 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-200 text-sm text-left transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto px-4 w-full space-y-6">
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex gap-4 ${msg.role === 'assistant' ? 'bg-gray-50/50 -mx-4 px-4 py-6 rounded-xl' : 'py-6'}`}>
                                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-gray-200' : 'bg-primary text-white'}`}>
                                    {msg.role === 'user' ? (
                                        avatarUrl ? <img src={avatarUrl} alt="User" className="w-full h-full rounded-full object-cover" /> : <User size={16} className="text-gray-500" />
                                    ) : (
                                        <Sparkles size={16} />
                                    )}
                                </div>
                                <div className="flex-1 space-y-2 overflow-hidden">
                                    <div className="text-sm font-medium text-gray-900">
                                        {msg.role === 'user' ? 'You' : 'Resonav AI'}
                                    </div>
                                    <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed whitespace-pre-wrap">
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="flex gap-4 bg-gray-50/50 -mx-4 px-4 py-6 rounded-xl">
                                <div className="shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center animate-pulse">
                                    <Sparkles size={16} />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-white via-white to-transparent pt-10 pb-6 px-4">
                <div className="max-w-3xl mx-auto">
                    <div className="relative flex items-end gap-2 bg-white border border-gray-300 shadow-sm rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Message Resonav..."
                            className="w-full max-h-[200px] resize-none bg-transparent border-none focus:ring-0 p-0 text-gray-900 placeholder:text-gray-400 sm:text-sm leading-relaxed"
                            rows={1}
                        />
                        <button
                            onClick={() => handleSubmit()}
                            disabled={!input.trim() || isProcessing}
                            className={`p-2 rounded-lg transition-all ${input.trim() && !isProcessing
                                ? 'bg-primary text-white hover:bg-primary/90'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            {isProcessing ? <StopCircle size={18} /> : <Send size={18} />}
                        </button>
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-2">
                        Resonav may produce inaccurate information about people, places, or facts.
                    </p>
                </div>
            </div>
        </div>
    )
}
