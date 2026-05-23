import { useState, useEffect } from 'react'
import ChatSidebar from '../components/ChatSidebar'
import ChatInterface from '../components/ChatInterface'
import type { Message } from '../components/ChatInterface'

// Simple UUID generator
const uuidv4 = () => Math.random().toString(36).substring(2, 15)

type ChatSession = {
	id: string
	title: string
	date: string
	messages: Message[]
}

export default function Dashboard() {
	// Initialize chats from local storage
	const [chats, setChats] = useState<ChatSession[]>(() => {
		const saved = localStorage.getItem('resonav-chats')
		if (saved) {
			try {
				const parsed = JSON.parse(saved)
				// Revive Date objects in messages
				return parsed.map((chat: any) => ({
					...chat,
					messages: chat.messages.map((m: any) => ({
						...m,
						timestamp: new Date(m.timestamp)
					}))
				}))
			} catch (e) {
				console.error("Failed to parse chat history", e)
				return []
			}
		}
		return []
	})

	const [activeChatId, setActiveChatId] = useState<string | undefined>(undefined)
	const [isProcessing, setIsProcessing] = useState(false)

	// Save to local storage whenever chats change
	useEffect(() => {
		localStorage.setItem('resonav-chats', JSON.stringify(chats))
	}, [chats])

	const activeChat = chats.find(c => c.id === activeChatId)
	const messages = activeChat ? activeChat.messages : []

	const handleNewChat = () => {
		setActiveChatId(undefined)
	}

	const handleSelectChat = (id: string) => {
		setActiveChatId(id)
	}

	const handleSendMessage = async (content: string) => {
		if (!content.trim()) return

		// Add user message
		const userMsg: Message = {
			id: uuidv4(),
			role: 'user',
			content,
			timestamp: new Date()
		}

		setIsProcessing(true)

		let currentChatId = activeChatId

		if (!currentChatId) {
			// Create new chat session
			const newId = uuidv4()
			const title = content.length > 30 ? content.substring(0, 30) + '...' : content
			const newChat: ChatSession = {
				id: newId,
				title,
				date: 'Just now', // You might want dynamic date formatting here
				messages: [userMsg]
			}
			setChats(prev => [newChat, ...prev])
			setActiveChatId(newId)
			currentChatId = newId
		} else {
			// Update existing chat
			setChats(prev => prev.map(chat =>
				chat.id === currentChatId
					? { ...chat, messages: [...chat.messages, userMsg] }
					: chat
			))
		}

		// Simulate AI response
		setTimeout(() => {
			const aiMsg: Message = {
				id: uuidv4(),
				role: 'assistant',
				content: `I've analyzed your query about "${content}". \n\nBased on your previous history and current context, here are some insights saved locally.`,
				timestamp: new Date()
			}

			setChats(prev => prev.map(chat =>
				chat.id === currentChatId
					? { ...chat, messages: [...chat.messages, aiMsg] }
					: chat
			))
			setIsProcessing(false)
		}, 1500)
	}

	const handleDeleteChat = (id: string) => {
		setChats(prev => prev.filter(c => c.id !== id))
		if (activeChatId === id) {
			handleNewChat()
		}
	}

	// Prepare history for sidebar
	const history = chats.map(c => ({
		id: c.id,
		title: c.title,
		date: c.date
	}))

	return (
		<div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-white">
			<ChatSidebar
				onNewChat={handleNewChat}
				history={history}
				activeChatId={activeChatId}
				onSelectChat={handleSelectChat}
				onDeleteChat={handleDeleteChat}
			/>
			<ChatInterface
				messages={messages}
				isProcessing={isProcessing}
				onSendMessage={handleSendMessage}
			/>
		</div>
	)
}
