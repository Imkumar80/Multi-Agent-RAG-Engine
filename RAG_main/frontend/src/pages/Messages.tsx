import { useEffect, useMemo, useState } from "react"
import { useLocation, useSearchParams } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { getConversationsApi, getMessagesApi } from "../utils/api"
import { useChatSocket } from "../hooks/useChatSocket"
import { Check, CheckCheck, Trash2 } from "lucide-react"

type UserLite = {
	id: string
	username: string
	firstName: string
	lastName: string
	title?: string
	institution?: string
	avatarUrl?: string
}

type MessageSummary = {
	id: string
	body: string
	createdAt: string
	senderId: string
}

type ConversationSummary = {
	id: string
	updatedAt: string
	otherUser: UserLite | null
	otherLastReadAt: string | null
	lastMessage: MessageSummary | null
	unreadCount: number
}

type ThreadMessage = {
	id: string
	body: string
	createdAt: string
	senderId: string
	sender?: UserLite
	status?: "pending" | "failed"
	clientId?: string
}

type ChatEventPayload = {
	success: boolean
	conversationId?: string
	message?: ThreadMessage
	sender?: UserLite
	recipient?: UserLite
	clientId?: string
	code?: string
	error?: string
}

type ConversationListProps = {
	loading: boolean
	conversations: ConversationSummary[]
	activeId: string | null
	isConnected: boolean
	onSelect: (id: string) => void
}

type MessageThreadProps = {
	headerUser: UserLite | null
	loading: boolean
	messages: ThreadMessage[]
	isConnected: boolean
	currentUserId?: string
	isSending: boolean
	error: string | null
	inputValue: string
	onInputChange: (value: string) => void
	onSend: (event: React.FormEvent) => void
	onRetry: (message: ThreadMessage) => void
	onUnsend: (messageId: string) => void
	onClearError: () => void
	otherLastReadAt: string | null
}

const makeClientId = () =>
	(typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
		? crypto.randomUUID()
		: `${Date.now()}-${Math.random().toString(16).slice(2)}`

function Avatar({ user }: { user: UserLite | null }) {
	if (!user) {
		return (
			<div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 font-bold">
				?
			</div>
		)
	}

	if (user.avatarUrl) {
		return (
			<img
				src={user.avatarUrl}
				alt={user.username}
				className="h-10 w-10 rounded-full object-cover"
			/>
		)
	}

	return (
		<div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
			{user.firstName[0]}{user.lastName[0]}
		</div>
	)
}

function ConversationRow({
	conversation,
	isActive,
	onSelect
}: {
	conversation: ConversationSummary
	isActive: boolean
	onSelect: (id: string) => void
}) {
	const user = conversation.otherUser
	return (
		<button
			onClick={() => onSelect(conversation.id)}
			className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${isActive ? "bg-gray-50" : ""}`}
		>
			<div className="flex items-center gap-3">
				<Avatar user={user} />
				<div className="flex-1 min-w-0">
					<p className="font-semibold text-gray-900 truncate">
						{user ? `${user.firstName} ${user.lastName}` : "Unknown User"}
					</p>
					<p className="text-xs text-gray-500 truncate">
						{conversation.lastMessage?.body ?? "No messages yet"}
					</p>
				</div>
				{conversation.unreadCount > 0 && (
					<span className="text-xs bg-primary text-white rounded-full px-2 py-0.5">
						{conversation.unreadCount}
					</span>
				)}
			</div>
		</button>
	)
}

function ConversationList({
	loading,
	conversations,
	activeId,
	isConnected,
	onSelect
}: ConversationListProps) {
	return (
		<section className="w-full lg:w-1/3 bg-white border border-gray-100 rounded-2xl shadow-sm">
			<header className="p-4 border-b border-gray-100">
				<h2 className="text-lg font-bold text-gray-900">Messages</h2>
				<p className="text-xs text-gray-500 mt-1">{isConnected ? "Online" : "Connecting..."}</p>
			</header>
			<div className="divide-y divide-gray-100">
				{loading && <div className="p-6 text-sm text-gray-500">Loading conversations...</div>}
				{!loading && conversations.length === 0 && (
					<div className="p-6 text-sm text-gray-500">No conversations yet.</div>
				)}
				{conversations.map(conversation => (
					<ConversationRow
						key={conversation.id}
						conversation={conversation}
						isActive={activeId === conversation.id}
						onSelect={onSelect}
					/>
				))}
			</div>
		</section>
	)
}

function MessageBubble({
	message,
	isMine,
	isSeen,
	onRetry,
	onUnsend
}: {
	message: ThreadMessage
	isMine: boolean
	isSeen: boolean
	onRetry: (message: ThreadMessage) => void
	onUnsend: (messageId: string) => void
}) {
	const isPending = message.status === "pending"
	const isFailed = message.status === "failed"
	const [showContextMenu, setShowContextMenu] = useState(false)
	const [menuPos, setMenuPos] = useState({ x: 0, y: 0 })

	const formatTime = (dateStr: string) => {
		try {
			return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		} catch {
			return ""
		}
	}

	const handleContextMenu = (e: React.MouseEvent) => {
		if (!isMine || isPending || isFailed) return
		e.preventDefault()
		setMenuPos({ x: e.clientX, y: e.clientY })
		setShowContextMenu(true)
	}

	const closeMenu = () => setShowContextMenu(false)

	useEffect(() => {
		if (showContextMenu) {
			window.addEventListener('click', closeMenu)
			return () => window.removeEventListener('click', closeMenu)
		}
	}, [showContextMenu])

	return (
		<div className={`flex flex-col relative ${isMine ? "items-end" : "items-start"}`}>
			<div
				onContextMenu={handleContextMenu}
				className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm relative group cursor-default shadow-sm ${isMine ? "bg-primary text-white" : "bg-gray-100 text-gray-900"} ${isPending ? "opacity-70" : ""} ${isFailed ? "border border-red-200 bg-red-50 text-red-700" : ""}`}
			>
				{message.body}

				<div className={`flex items-center gap-1 mt-1 text-[10px] ${isMine ? "text-primary-foreground/70" : "text-gray-400"}`}>
					<span>{formatTime(message.createdAt)}</span>
					{isMine && !isPending && !isFailed && (
						<span className="flex items-center ml-1">
							{isSeen ? (
								<span title="Seen"><CheckCheck size={12} className="text-white" /></span>
							) : (
								<span title="Sent"><Check size={12} className="text-white/70" /></span>
							)}
						</span>
					)}
				</div>
			</div>

			{showContextMenu && (
				<div
					className="fixed z-50 bg-white border border-gray-100 rounded-lg shadow-xl py-1 w-32 animate-in fade-in zoom-in-95 duration-100"
					style={{ top: menuPos.y, left: menuPos.x }}
				>
					<button
						onClick={() => onUnsend(message.id)}
						className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
					>
						<Trash2 size={14} />
						Unsend
					</button>
				</div>
			)}

			{isPending && (
				<p className="text-[11px] text-gray-400 mt-1">Sending...</p>
			)}
			{isFailed && (
				<button
					onClick={() => onRetry(message)}
					className="text-[11px] text-red-500 mt-1 hover:underline"
					type="button"
				>
					Failed to send · Retry
				</button>
			)}
		</div>
	)
}

function MessageThread({
	headerUser,
	loading,
	messages,
	isConnected,
	currentUserId,
	isSending,
	error,
	inputValue,
	onInputChange,
	onSend,
	onRetry,
	onUnsend,
	onClearError,
	otherLastReadAt
}: MessageThreadProps) {
	return (
		<section className="w-full lg:w-2/3 bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col min-h-[520px]">
			<header className="p-4 border-b border-gray-100">
				{headerUser ? (
					<div>
						<h3 className="text-lg font-bold text-gray-900">
							{headerUser.firstName} {headerUser.lastName}
						</h3>
						<p className="text-xs text-gray-500">@{headerUser.username}</p>
					</div>
				) : (
					<p className="text-sm text-gray-500">Select a conversation</p>
				)}
			</header>
			<div className="flex-1 p-4 overflow-y-auto space-y-3">
				{loading && <div className="text-sm text-gray-500">Loading messages...</div>}
				{!loading && headerUser && messages.length === 0 && (
					<div className="text-sm text-gray-400">No messages yet. Say hi!</div>
				)}
				{messages.map(message => {
					const isSeen = !!(otherLastReadAt && new Date(message.createdAt) <= new Date(otherLastReadAt))
					return (
						<MessageBubble
							key={message.id}
							message={message}
							isMine={message.senderId === currentUserId}
							isSeen={isSeen}
							onRetry={onRetry}
							onUnsend={onUnsend}
						/>
					)
				})}
			</div>
			<form onSubmit={onSend} className="p-4 border-t border-gray-100">
				{error && <div className="text-xs text-red-600 mb-2">{error}</div>}
				<div className="flex items-center gap-3">
					<input
						type="text"
						value={inputValue}
						onChange={(event) => {
							onClearError()
							onInputChange(event.target.value)
						}}
						placeholder={headerUser ? `Message ${headerUser.firstName}...` : "Select a conversation to start"}
						disabled={!headerUser}
						className="flex-1 border border-gray-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
					/>
					<button
						type="submit"
						disabled={!headerUser || !inputValue.trim() || isSending}
						className="px-4 py-2 rounded-full bg-primary text-white text-sm font-semibold disabled:opacity-50"
					>
						{isSending ? "Sending..." : "Send"}
					</button>
				</div>
				<p className="text-[11px] text-gray-400 mt-2">{isConnected ? "Realtime connected" : "Connecting to chat..."}</p>
			</form>
		</section>
	)
}

export default function Messages() {
	const { id: authId } = useAuth()
	const location = useLocation()
	const [searchParams] = useSearchParams()
	const recipientIdFromQuery = searchParams.get("recipientId")
	const stateRecipient = (location.state as { recipient?: UserLite } | undefined)?.recipient

	const [conversations, setConversations] = useState<ConversationSummary[]>([])
	const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
	const [pendingRecipient, setPendingRecipient] = useState<UserLite | null>(null)
	const [messagesByConversation, setMessagesByConversation] = useState<Record<string, ThreadMessage[]>>({})
	const [localMessagesByKey, setLocalMessagesByKey] = useState<Record<string, ThreadMessage[]>>({})
	const [loading, setLoading] = useState(true)
	const [loadingMessages, setLoadingMessages] = useState(false)
	const [isSending, setIsSending] = useState(false)
	const [messageInput, setMessageInput] = useState("")
	const [error, setError] = useState<string | null>(null)

	const sortConversations = (items: ConversationSummary[]) =>
		[...items].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

	const getPendingKey = (recipientId: string) => `pending:${recipientId}`
	const activeKey = activeConversationId
		? activeConversationId
		: pendingRecipient
			? getPendingKey(pendingRecipient.id)
			: null

	const removeLocalMessageByClientId = (clientId?: string) => {
		if (!clientId) return
		setLocalMessagesByKey(prev => {
			let changed = false
			const next: Record<string, ThreadMessage[]> = { ...prev }
			Object.keys(next).forEach(key => {
				const filtered = next[key].filter(message => message.clientId !== clientId)
				if (filtered.length !== next[key].length) {
					next[key] = filtered
					changed = true
				}
			})
			return changed ? next : prev
		})
	}

	const updateLocalMessageStatus = (key: string, clientId: string, status: "pending" | "failed") => {
		setLocalMessagesByKey(prev => ({
			...prev,
			[key]: (prev[key] ?? []).map(message =>
				message.clientId === clientId ? { ...message, status } : message
			)
		}))
	}

	const clearLocalMessagesForKey = (key: string) => {
		setLocalMessagesByKey(prev => {
			if (!prev[key]) return prev
			const next = { ...prev }
			delete next[key]
			return next
		})
	}

	const { sendMessage, unsendMessage, markAsRead, isConnected } = useChatSocket({
		onMessage: (payload: ChatEventPayload) => {
			if (!payload.success || !payload.conversationId || !payload.message) return

			const conversationId = payload.conversationId
			const incoming = payload.message
			const senderId = incoming.senderId
			const otherUser = senderId === authId ? payload.recipient : payload.sender

			removeLocalMessageByClientId(payload.clientId)

			setMessagesByConversation(prev => {
				const existing = prev[conversationId] ?? []
				if (existing.some(msg => msg.id === incoming.id)) return prev
				return { ...prev, [conversationId]: [...existing, incoming] }
			})

			setConversations(prev => {
				const current = prev.find(conversation => conversation.id === conversationId)
				if (!current) {
					const newConversation: ConversationSummary = {
						id: conversationId,
						updatedAt: incoming.createdAt,
						otherUser: otherUser ?? null,
						otherLastReadAt: null,
						lastMessage: {
							id: incoming.id,
							body: incoming.body,
							createdAt: incoming.createdAt,
							senderId: incoming.senderId
						},
						unreadCount: senderId === authId || activeConversationId === conversationId ? 0 : 1
					}
					return sortConversations([...prev, newConversation])
				}

				const unreadCount = senderId === authId || activeConversationId === conversationId
					? 0
					: current.unreadCount + 1

				const updated = prev.map(conversation => conversation.id === conversationId ? {
					...conversation,
					updatedAt: incoming.createdAt,
					lastMessage: {
						id: incoming.id,
						body: incoming.body,
						createdAt: incoming.createdAt,
						senderId: incoming.senderId
					},
					unreadCount
				} : conversation)

				return sortConversations(updated)
			})

			if (activeConversationId === conversationId && senderId !== authId) {
				markAsRead(conversationId).catch(() => undefined)
			}

			if (!activeConversationId && pendingRecipient && otherUser?.id === pendingRecipient.id) {
				setActiveConversationId(conversationId)
				setPendingRecipient(null)
				clearLocalMessagesForKey(getPendingKey(pendingRecipient.id))
			}
		},
		onUnsend: (payload) => {
			setMessagesByConversation(prev => {
				const existing = prev[payload.conversationId] ?? []
				return { ...prev, [payload.conversationId]: existing.filter(msg => msg.id !== payload.messageId) }
			})
			setConversations(prev => prev.map(conv => {
				if (conv.id === payload.conversationId && conv.lastMessage?.id === payload.messageId) {
					return { ...conv, lastMessage: null }
				}
				return conv
			}))
		},
		onReadUpdate: (payload) => {
			setConversations(prev => prev.map(conv =>
				conv.id === payload.conversationId ? { ...conv, otherLastReadAt: payload.lastReadAt } : conv
			))
		}
	})

	useEffect(() => {
		const loadConversations = async () => {
			setLoading(true)
			try {
				const res = await getConversationsApi()
				if (res.success) {
					const sorted = sortConversations(res.conversations)
					setConversations(sorted)
					const match = recipientIdFromQuery
						? sorted.find(conversation => conversation.otherUser?.id === recipientIdFromQuery)
						: sorted[0]
					if (match) {
						setActiveConversationId(match.id)
						setPendingRecipient(null)
						markAsRead(match.id).catch(() => undefined)
					} else if (recipientIdFromQuery && stateRecipient) {
						setPendingRecipient(stateRecipient)
						setActiveConversationId(null)
					}
				}
			} catch (err) {
				console.error("Failed to load conversations", err)
			} finally {
				setLoading(false)
			}
		}

		loadConversations()
	}, [recipientIdFromQuery, stateRecipient, markAsRead])

	useEffect(() => {
		const loadMessages = async () => {
			if (!activeConversationId) return
			if (messagesByConversation[activeConversationId]) return

			setLoadingMessages(true)
			try {
				const res = await getMessagesApi(activeConversationId)
				if (res.success) {
					setMessagesByConversation(prev => ({ ...prev, [activeConversationId]: res.messages }))
					markAsRead(activeConversationId).catch(() => undefined)
					setConversations(prev => prev.map(conversation =>
						conversation.id === activeConversationId ? { ...conversation, unreadCount: 0 } : conversation
					))
				}
			} catch (err) {
				console.error("Failed to load messages", err)
			} finally {
				setLoadingMessages(false)
			}
		}

		loadMessages()
	}, [activeConversationId, messagesByConversation, markAsRead])

	const activeConversation = useMemo(
		() => conversations.find(conversation => conversation.id === activeConversationId) ?? null,
		[conversations, activeConversationId]
	)

	const serverMessages = activeConversationId ? (messagesByConversation[activeConversationId] ?? []) : []
	const localMessages = activeKey ? (localMessagesByKey[activeKey] ?? []) : []
	const activeMessages = [...serverMessages, ...localMessages]
	const headerUser = activeConversation?.otherUser ?? pendingRecipient

	const handleSelectConversation = (conversationId: string) => {
		setActiveConversationId(conversationId)
		setPendingRecipient(null)
		setError(null)
		markAsRead(conversationId).catch(() => undefined)
		setConversations(prev => prev.map(conversation =>
			conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation
		))
	}

	const handleUnsend = async (messageId: string) => {
		const res = await unsendMessage(messageId)
		if (!res.success) {
			setError(res.error || "Failed to unsend")
		}
	}

	const handleSendMessage = async (event: React.FormEvent) => {
		event.preventDefault()
		if (isSending) return
		setError(null)

		const body = messageInput.trim()
		if (!body) return

		let recipientId: string | null = null
		if (activeConversation?.otherUser?.id) {
			recipientId = activeConversation.otherUser.id
		} else if (pendingRecipient?.id) {
			recipientId = pendingRecipient.id
		}

		if (!recipientId) {
			setError("Select a conversation to message.")
			return
		}

		const clientId = makeClientId()
		const pendingMessage: ThreadMessage = {
			id: clientId,
			clientId,
			body,
			createdAt: new Date().toISOString(),
			senderId: authId ?? "me",
			status: "pending"
		}

		if (activeKey) {
			setLocalMessagesByKey(prev => ({
				...prev,
				[activeKey]: [...(prev[activeKey] ?? []), pendingMessage]
			}))
		}

		setMessageInput("")
		setIsSending(true)

		const response = await sendMessage(recipientId, body, clientId)
		setIsSending(false)

		if (!response.success) {
			if (activeKey) {
				updateLocalMessageStatus(activeKey, clientId, "failed")
			}
			setError(response.error || response.code || "Failed to send message.")
			return
		}

		removeLocalMessageByClientId(clientId)

		if (!activeConversationId && pendingRecipient && response.conversationId) {
			setActiveConversationId(response.conversationId)
			setPendingRecipient(null)
			clearLocalMessagesForKey(getPendingKey(pendingRecipient.id))
		}

		if (response.message && response.conversationId) {
			const conversationId = response.conversationId
			setMessagesByConversation(prev => {
				const existing = prev[conversationId] ?? []
				if (existing.some(msg => msg.id === response.message?.id)) return prev
				return { ...prev, [conversationId]: [...existing, response.message!] }
			})
		}
	}

	const handleRetryMessage = async (message: ThreadMessage) => {
		if (isSending) return
		if (!message.body) return

		let recipientId: string | null = null
		if (activeConversation?.otherUser?.id) {
			recipientId = activeConversation.otherUser.id
		} else if (pendingRecipient?.id) {
			recipientId = pendingRecipient.id
		}

		if (!recipientId || !activeKey) return

		const clientId = makeClientId()
		const pendingMessage: ThreadMessage = {
			...message,
			id: clientId,
			clientId,
			status: "pending",
			createdAt: new Date().toISOString()
		}

		setLocalMessagesByKey(prev => ({
			...prev,
			[activeKey]: [...(prev[activeKey] ?? []).filter(item => item.id !== message.id), pendingMessage]
		}))

		setIsSending(true)
		const response = await sendMessage(recipientId, message.body, clientId)
		setIsSending(false)

		if (!response.success) {
			updateLocalMessageStatus(activeKey, clientId, "failed")
			setError(response.error || response.code || "Failed to send message.")
			return
		}

		removeLocalMessageByClientId(clientId)
		if (!activeConversationId && pendingRecipient && response.conversationId) {
			setActiveConversationId(response.conversationId)
			setPendingRecipient(null)
			clearLocalMessagesForKey(getPendingKey(pendingRecipient.id))
		}
	}

	return (
		<div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
			<div className="flex flex-col lg:flex-row gap-6">
				<ConversationList
					loading={loading}
					conversations={conversations}
					activeId={activeConversationId}
					isConnected={isConnected}
					onSelect={handleSelectConversation}
				/>
				<MessageThread
					headerUser={headerUser}
					loading={loadingMessages}
					messages={activeMessages}
					isConnected={isConnected}
					currentUserId={authId}
					isSending={isSending}
					error={error}
					inputValue={messageInput}
					onInputChange={setMessageInput}
					onSend={handleSendMessage}
					onRetry={handleRetryMessage}
					onUnsend={handleUnsend}
					onClearError={() => setError(null)}
					otherLastReadAt={activeConversation?.otherLastReadAt ?? null}
				/>
			</div>
		</div>
	)
}
