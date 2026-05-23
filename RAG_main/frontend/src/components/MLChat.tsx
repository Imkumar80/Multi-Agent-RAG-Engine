import { useEffect, useState } from 'react'
import axios from 'axios'
import { Send, MessageSquare, BookOpen } from 'lucide-react'
import {
	addMessageToSessionApi,
	createChatSessionApi,
	getConversationHistoryApi,
	getSessionInfoApi
} from '../utils/api'
import type { MlChatSessionInfoResponse, MlConversationMessage } from '../types/mlApi'

interface MLChatProps {
	paperId: number
	paperTitle: string
	userId: string
}

const HISTORY_LIMIT = 100

function getErrorMessage(error: unknown, fallback: string): string {
	if (axios.isAxiosError(error)) {
		const responseData = error.response?.data
		if (responseData && typeof responseData === 'object' && 'detail' in responseData) {
			const detail = (responseData as { detail?: unknown }).detail
			if (typeof detail === 'string' && detail.trim()) {
				return detail
			}
		}
		if (typeof error.message === 'string' && error.message.trim()) {
			return error.message
		}
	}

	if (error instanceof Error && error.message.trim()) {
		return error.message
	}

	return fallback
}

function parseSessionId(rawSessionId: string | number | undefined): number | null {
	if (typeof rawSessionId === 'number' && Number.isInteger(rawSessionId) && rawSessionId > 0) {
		return rawSessionId
	}

	if (typeof rawSessionId === 'string') {
		const normalized = rawSessionId.trim()
		if (!/^\d+$/.test(normalized)) {
			return null
		}
		const parsed = Number(normalized)
		if (Number.isInteger(parsed) && parsed > 0) {
			return parsed
		}
	}

	return null
}

function orderMessages(messages: MlConversationMessage[]): MlConversationMessage[] {
	return [...messages].sort((a, b) => {
		const timeA = Date.parse(a.created_at)
		const timeB = Date.parse(b.created_at)
		const safeTimeA = Number.isNaN(timeA) ? 0 : timeA
		const safeTimeB = Number.isNaN(timeB) ? 0 : timeB

		if (safeTimeA === safeTimeB) {
			return a.id - b.id
		}

		return safeTimeA - safeTimeB
	})
}

function formatMessageTime(createdAt: string): string {
	const parsed = new Date(createdAt)
	if (Number.isNaN(parsed.getTime())) {
		return ''
	}
	return parsed.toLocaleTimeString()
}

export default function MLChat({ paperId, paperTitle, userId }: MLChatProps) {
	const [sessionId, setSessionId] = useState<number | null>(null)
	const [sessionInfo, setSessionInfo] = useState<MlChatSessionInfoResponse | null>(null)
	const [messages, setMessages] = useState<MlConversationMessage[]>([])
	const [inputMessage, setInputMessage] = useState('')
	const [isInitializing, setIsInitializing] = useState(true)
	const [isSending, setIsSending] = useState(false)
	const [initError, setInitError] = useState('')
	const [sendError, setSendError] = useState('')
	const [retryCount, setRetryCount] = useState(0)

	useEffect(() => {
		let isActive = true
		const loadConversationState = async (activeSessionId: number) => {
			const [conversation, session] = await Promise.all([
				getConversationHistoryApi(activeSessionId, HISTORY_LIMIT, 0),
				getSessionInfoApi(activeSessionId)
			])

			return {
				conversationMessages: orderMessages(conversation.messages || []),
				session
			}
		}

		const initChat = async () => {
			setIsInitializing(true)
			setInitError('')
			setSendError('')
			setSessionInfo(null)
			setMessages([])
			setSessionId(null)

			try {
				const createdSession = await createChatSessionApi({
					paper_id: paperId,
					user_id: userId,
					session_title: `Chat about: ${paperTitle}`
				})

				const resolvedSessionId = parseSessionId(createdSession.session_id ?? createdSession.id)
				if (resolvedSessionId === null) {
					throw new Error('ML backend returned an invalid session identifier.')
				}

				const { conversationMessages, session } = await loadConversationState(resolvedSessionId)

				if (!isActive) return

				setSessionId(resolvedSessionId)
				setSessionInfo(session)
				setMessages(conversationMessages)
			} catch (error: unknown) {
				if (!isActive) return
				setInitError(getErrorMessage(error, 'Failed to initialize ML chat session.'))
			} finally {
				if (isActive) {
					setIsInitializing(false)
				}
			}
		}

		initChat()

		return () => {
			isActive = false
		}
	}, [paperId, paperTitle, userId, retryCount])

	const handleSendMessage = async () => {
		if (isSending || isInitializing || !sessionId || initError) return

		const trimmedMessage = inputMessage.trim()
		if (!trimmedMessage) return

		setInputMessage('')
		setSendError('')
		setIsSending(true)

		try {
			await addMessageToSessionApi({
				session_id: sessionId,
				content: trimmedMessage,
				metadata: {}
			})

			const [conversation, session] = await Promise.all([
				getConversationHistoryApi(sessionId, HISTORY_LIMIT, 0),
				getSessionInfoApi(sessionId)
			])
			setSessionInfo(session)
			setMessages(orderMessages(conversation.messages || []))
		} catch (error: unknown) {
			setInputMessage(trimmedMessage)
			setSendError(getErrorMessage(error, 'Failed to send message. Please try again.'))
		} finally {
			setIsSending(false)
		}
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			void handleSendMessage()
		}
	}

	if (isInitializing) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-center">
					<BookOpen className="mx-auto h-12 w-12 text-blue-500 mb-4" />
					<p className="text-gray-600">Initializing chat session...</p>
				</div>
			</div>
		)
	}

	if (initError) {
		return (
			<div className="flex items-center justify-center h-64 p-4">
				<div className="max-w-md text-center">
					<BookOpen className="mx-auto h-12 w-12 text-red-500 mb-4" />
					<p className="text-red-700 mb-4">{initError}</p>
					<button
						onClick={() => setRetryCount((prev) => prev + 1)}
						className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
					>
						Retry Session Setup
					</button>
				</div>
			</div>
		)
	}

	const canSendMessage = Boolean(inputMessage.trim()) && !isSending && !isInitializing && !initError && sessionId !== null

	return (
		<div className="flex flex-col h-full bg-gray-50">
			<div className="bg-white border-b p-4">
				<div className="flex items-center gap-3">
					<BookOpen className="h-6 w-6 text-blue-500" />
					<div>
						<h2 className="text-lg font-semibold text-gray-900">Chat with Paper</h2>
						<p className="text-sm text-gray-600 truncate">{paperTitle}</p>
						{sessionInfo && (
							<p className="text-xs text-gray-500 mt-1">
								Session #{sessionInfo.session_id} • {sessionInfo.message_count} messages
							</p>
						)}
					</div>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{messages.length === 0 ? (
					<div className="text-center py-8">
						<MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
						<p className="text-gray-500">Start a conversation about this paper</p>
					</div>
				) : (
					messages.map((message) => {
						const formattedTime = formatMessageTime(message.created_at)
						return (
							<div
								key={message.id}
								className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
							>
								<div
									className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${message.role === 'user'
										? 'bg-blue-500 text-white'
										: 'bg-white text-gray-900 border'
									}`}
								>
									<p className="text-sm whitespace-pre-wrap">{message.content}</p>
									{formattedTime && (
										<p className="text-xs opacity-70 mt-1">{formattedTime}</p>
									)}
								</div>
							</div>
						)
					})
				)}

				{isSending && (
					<div className="flex justify-start">
						<div className="bg-white border px-4 py-2 rounded-lg">
							<div className="flex items-center gap-2">
								<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
								<span className="text-sm text-gray-500">Thinking...</span>
							</div>
						</div>
					</div>
				)}
			</div>

			<div className="bg-white border-t p-4">
				{sendError && (
					<p className="text-sm text-red-600 mb-2">{sendError}</p>
				)}
				<div className="flex gap-2">
					<input
						type="text"
						value={inputMessage}
						onChange={(e) => setInputMessage(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="Ask a question about this paper..."
						className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						disabled={isSending || isInitializing || !sessionId || Boolean(initError)}
					/>
					<button
						onClick={() => {
							void handleSendMessage()
						}}
						disabled={!canSendMessage}
						className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						<Send className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	)
}
