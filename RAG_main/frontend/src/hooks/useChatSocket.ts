import { useCallback, useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { baseURL } from "../lib/values"
import { useAuth } from "../context/AuthContext"

type ChatMessagePayload = {
	success: boolean
	conversationId?: string
	message?: any
	sender?: any
	recipient?: any
	code?: string
	error?: string
	clientId?: string
}

type UseChatSocketOptions = {
	onMessage: (payload: ChatMessagePayload) => void
	onUnsend?: (payload: { messageId: string, conversationId: string }) => void
	onReadUpdate?: (payload: { conversationId: string, userId: string, lastReadAt: string }) => void
	onError?: (payload: ChatMessagePayload) => void
}

export function useChatSocket({ onMessage, onUnsend, onReadUpdate, onError }: UseChatSocketOptions) {
	const { isAuthenticated } = useAuth()
	const socketRef = useRef<Socket | null>(null)
	const onMessageRef = useRef(onMessage)
	const onUnsendRef = useRef(onUnsend)
	const onReadUpdateRef = useRef(onReadUpdate)
	const onErrorRef = useRef(onError)
	const [isConnected, setIsConnected] = useState(false)

	useEffect(() => {
		onMessageRef.current = onMessage
		onUnsendRef.current = onUnsend
		onReadUpdateRef.current = onReadUpdate
		onErrorRef.current = onError
	}, [onMessage, onUnsend, onReadUpdate, onError])

	useEffect(() => {
		if (!isAuthenticated) {
			socketRef.current?.disconnect()
			socketRef.current = null
			setIsConnected(false)
			return
		}

		const socket = io(baseURL, { withCredentials: true })
		socketRef.current = socket

		socket.on("connect", () => setIsConnected(true))
		socket.on("disconnect", () => setIsConnected(false))
		socket.on("chat:message", payload => onMessageRef.current(payload))
		socket.on("chat:message_unsend", payload => onUnsendRef.current?.(payload))
		socket.on("chat:read_update", payload => onReadUpdateRef.current?.(payload))
		socket.on("chat:error", payload => onErrorRef.current?.(payload))

		return () => {
			socket.off("chat:message")
			socket.off("chat:message_unsend")
			socket.off("chat:read_update")
			socket.off("chat:error")
			socket.disconnect()
		}
	}, [isAuthenticated])

	const sendMessage = useCallback((recipientId: string, body: string, clientId?: string) => {
		return new Promise<ChatMessagePayload>((resolve) => {
			const socket = socketRef.current
			if (!socket) {
				resolve({ success: false, code: "SOCKET_DISCONNECTED", error: "Socket not connected" })
				return
			}
			socket.emit("chat:send", { recipientId, body, clientId }, (response: ChatMessagePayload) => resolve(response))
		})
	}, [])

	const unsendMessage = useCallback((messageId: string) => {
		return new Promise<{ success: boolean; error?: string }>((resolve) => {
			const socket = socketRef.current
			if (!socket) {
				resolve({ success: false, error: "Socket not connected" })
				return
			}
			socket.emit("chat:unsend", { messageId }, (response: any) => resolve(response))
		})
	}, [])

	const markAsRead = useCallback((conversationId: string) => {
		return new Promise<{ success: boolean; lastReadAt?: string }>((resolve) => {
			const socket = socketRef.current
			if (!socket) {
				resolve({ success: false })
				return
			}
			socket.emit("chat:read", { conversationId }, (response: any) => resolve(response))
		})
	}, [])

	return { sendMessage, unsendMessage, markAsRead, isConnected }
}
