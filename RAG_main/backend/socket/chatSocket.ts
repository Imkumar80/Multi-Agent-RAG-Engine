import type { Server as HttpServer } from "http"
import { Server } from "socket.io"
import { prisma } from "../utils/prisma"
import { getUserIdFromSocket } from "../utils/auth"
import { getMaxMessageLength, isMessageBodyValid, makePairKey, normalizeMessageBody } from "../utils/chat"

const defaultOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"]
const clientOrigins = process.env.CLIENT_URL
	? process.env.CLIENT_URL.split(",").map(origin => origin.trim()).filter(Boolean)
	: defaultOrigins

type SendPayload = {
	recipientId?: string
	body?: string
	clientId?: string
}

export function initChatSocket(server: HttpServer) {
	const io = new Server(server, {
		cors: {
			origin: clientOrigins.length ? clientOrigins : true,
			credentials: true
		}
	})

	io.use((socket, next) => {
		const userId = getUserIdFromSocket(socket)
		if (!userId) {
			return next(new Error("AUTH_REQUIRED"))
		}
		socket.data.userId = userId
		return next()
	})

	io.on("connection", (socket) => {
		const userId = socket.data.userId as string
		socket.join(`user:${userId}`)

		socket.on("chat:send", async (payload: SendPayload, callback?: (response: any) => void) => {
			const recipientId = payload?.recipientId
			const body = payload?.body ?? ""
			const clientId = payload?.clientId

			if (!recipientId || typeof recipientId !== "string") {
				const response = { success: false, code: "INVALID_RECIPIENT", error: "Recipient is required" }
				socket.emit("chat:error", response)
				callback?.(response)
				return
			}

			if (recipientId === userId) {
				const response = { success: false, code: "SELF_MESSAGE", error: "Cannot message yourself" }
				socket.emit("chat:error", response)
				callback?.(response)
				return
			}

			if (!isMessageBodyValid(body)) {
				const response = {
					success: false,
					code: "INVALID_MESSAGE",
					error: `Message must be 1-${getMaxMessageLength()} characters`
				}
				socket.emit("chat:error", response)
				callback?.(response)
				return
			}

			try {
				const recipient = await prisma.user.findUnique({
					where: { id: recipientId },
					select: {
						id: true,
						username: true,
						firstName: true,
						lastName: true,
						title: true,
						institution: true
					}
				})

				if (!recipient) {
					const response = { success: false, code: "RECIPIENT_NOT_FOUND", error: "Recipient not found" }
					socket.emit("chat:error", response)
					callback?.(response)
					return
				}

				const pairKey = makePairKey(userId, recipientId)
				let conversation = await prisma.conversation.findUnique({ where: { pairKey } })

				if (!conversation) {
					try {
						conversation = await prisma.conversation.create({
							data: {
								type: "Direct",
								pairKey,
								participants: {
									create: [{ userId }, { userId: recipientId }]
								}
							}
						})
					} catch (error: any) {
						if (error?.code === "P2002") {
							conversation = await prisma.conversation.findUnique({ where: { pairKey } })
						} else {
							throw error
						}
					}
				}

				if (!conversation) {
					const response = { success: false, code: "CONVERSATION_ERROR", error: "Failed to create conversation" }
					socket.emit("chat:error", response)
					callback?.(response)
					return
				}

				const normalizedBody = normalizeMessageBody(body)
				const message = await prisma.message.create({
					data: {
						conversationId: conversation.id,
						senderId: userId,
						body: normalizedBody
					},
					select: {
						id: true,
						body: true,
						createdAt: true,
						senderId: true,
						sender: {
							select: {
								id: true,
								username: true,
								firstName: true,
								lastName: true
							}
						}
					}
				})

				await prisma.$transaction([
					prisma.conversation.update({
						where: { id: conversation.id },
						data: { updatedAt: new Date() }
					}),
					prisma.conversationParticipant.updateMany({
						where: { conversationId: conversation.id, userId },
						data: { lastReadAt: new Date() }
					})
				])

				const responsePayload = {
					success: true,
					conversationId: conversation.id,
					message,
					sender: message.sender,
					recipient,
					clientId
				}

				io.to(`user:${userId}`).to(`user:${recipientId}`).emit("chat:message", responsePayload)
				callback?.(responsePayload)
			} catch (error) {
				console.error("Chat send error:", error)
				const response = { success: false, code: "SERVER_ERROR", error: "Failed to send message" }
				socket.emit("chat:error", response)
				callback?.(response)
			}
		})

		socket.on("chat:unsend", async (payload: { messageId: string }, callback?: (response: any) => void) => {
			const { messageId } = payload
			if (!messageId) return

			try {
				const message = await prisma.message.findUnique({
					where: { id: messageId },
					include: { conversation: { include: { participants: true } } }
				})

				if (!message || message.senderId !== userId) {
					const response = { success: false, code: "UNAUTHORIZED", error: "Cannot unsend this message" }
					callback?.(response)
					return
				}

				await prisma.message.delete({ where: { id: messageId } })

				const recipient = message.conversation.participants.find(p => p.userId !== userId)
				const responsePayload = { success: true, messageId, conversationId: message.conversationId }

				// Broadcast to both
				io.to(`user:${userId}`).to(`user:${recipient?.userId}`).emit("chat:message_unsend", responsePayload)
				callback?.(responsePayload)
			} catch (error) {
				console.error("Unsend error:", error)
				callback?.({ success: false, error: "Failed to unsend" })
			}
		})

		socket.on("chat:read", async (payload: { conversationId: string }, callback?: (response: any) => void) => {
			const { conversationId } = payload
			if (!conversationId) return

			try {
				const now = new Date()
				await prisma.conversationParticipant.update({
					where: { conversationId_userId: { conversationId, userId } },
					data: { lastReadAt: now }
				})

				const conversation = await prisma.conversation.findUnique({
					where: { id: conversationId },
					include: { participants: true }
				})

				const recipient = conversation?.participants.find(p => p.userId !== userId)
				if (recipient) {
					io.to(`user:${recipient.userId}`).emit("chat:read_update", {
						conversationId,
						userId,
						lastReadAt: now
					})
				}
				callback?.({ success: true, lastReadAt: now })
			} catch (error) {
				console.error("Mark read error:", error)
				callback?.({ success: false })
			}
		})
	})

	return io
}
