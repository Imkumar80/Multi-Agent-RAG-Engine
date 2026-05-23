import type { Request, Response } from "express"
import { prisma } from "../utils/prisma"
import { ResponseStatus } from "../utils/values"
import { getUserIdFromRequest } from "../utils/auth"

const MESSAGE_PAGE_SIZE = 50
const getSingleParam = (value: string | string[] | undefined) =>
	typeof value === "string" ? value : Array.isArray(value) ? value[0] : undefined

export const listConversations = async (req: Request, res: Response) => {
	const userId = getUserIdFromRequest(req)
	if (!userId) {
		return res.status(ResponseStatus.unauthorized).json({ msg: "Not authenticated", success: false })
	}

	try {
		const conversations = await prisma.conversation.findMany({
			where: { participants: { some: { userId } } },
			orderBy: { updatedAt: "desc" },
			include: {
				participants: {
					include: {
						user: {
							select: {
								id: true,
								username: true,
								firstName: true,
								lastName: true,
								title: true,
								institution: true
							}
						}
					}
				},
				messages: {
					take: 1,
					orderBy: { createdAt: "desc" },
					select: {
						id: true,
						body: true,
						createdAt: true,
						senderId: true
					}
				}
			},
			take: 50
		})

		const conversationSummaries = await Promise.all(conversations.map(async (conversation) => {
			const me = conversation.participants.find(participant => participant.userId === userId)
			const other = conversation.participants.find(participant => participant.userId !== userId)
			const lastReadAt = me?.lastReadAt ?? null

			const unreadCount = await prisma.message.count({
				where: {
					conversationId: conversation.id,
					senderId: { not: userId },
					...(lastReadAt ? { createdAt: { gt: lastReadAt } } : {})
				}
			})

			return {
				id: conversation.id,
				updatedAt: conversation.updatedAt,
				otherUser: other?.user ?? null,
				otherLastReadAt: other?.lastReadAt ?? null,
				lastMessage: conversation.messages[0] ?? null,
				unreadCount
			}
		}))

		return res.status(ResponseStatus.success).json({ conversations: conversationSummaries, success: true })
	} catch (error) {
		console.error("List conversations error:", error)
		return res.status(ResponseStatus.internalServerError).json({ msg: "Failed to load conversations", success: false })
	}
}

export const getMessages = async (req: Request, res: Response) => {
	const userId = getUserIdFromRequest(req)
	if (!userId) {
		return res.status(ResponseStatus.unauthorized).json({ msg: "Not authenticated", success: false })
	}

	const conversationId = getSingleParam(req.params.id)
	const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined
	if (!conversationId) {
		return res.status(ResponseStatus.clientError).json({ msg: "Invalid conversation id", success: false })
	}

	try {
		const participant = await prisma.conversationParticipant.findUnique({
			where: { conversationId_userId: { conversationId, userId } }
		})

		if (!participant) {
			return res.status(ResponseStatus.notFound).json({ msg: "Conversation not found", success: false })
		}

		const fetched = await prisma.message.findMany({
			where: { conversationId },
			orderBy: { createdAt: "desc" },
			take: MESSAGE_PAGE_SIZE,
			...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
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

		const nextCursor = fetched.length === MESSAGE_PAGE_SIZE ? fetched[fetched.length - 1].id : null
		const messages = [...fetched].reverse()

		return res.status(ResponseStatus.success).json({ messages, nextCursor, success: true })
	} catch (error) {
		console.error("Get messages error:", error)
		return res.status(ResponseStatus.internalServerError).json({ msg: "Failed to load messages", success: false })
	}
}

export const markConversationRead = async (req: Request, res: Response) => {
	const userId = getUserIdFromRequest(req)
	if (!userId) {
		return res.status(ResponseStatus.unauthorized).json({ msg: "Not authenticated", success: false })
	}

	const conversationId = getSingleParam(req.params.id)
	if (!conversationId) {
		return res.status(ResponseStatus.clientError).json({ msg: "Invalid conversation id", success: false })
	}

	try {
		const participant = await prisma.conversationParticipant.findUnique({
			where: { conversationId_userId: { conversationId, userId } }
		})

		if (!participant) {
			return res.status(ResponseStatus.notFound).json({ msg: "Conversation not found", success: false })
		}

		await prisma.conversationParticipant.update({
			where: { conversationId_userId: { conversationId, userId } },
			data: { lastReadAt: new Date() }
		})

		return res.status(ResponseStatus.success).json({ success: true })
	} catch (error) {
		console.error("Mark read error:", error)
		return res.status(ResponseStatus.internalServerError).json({ msg: "Failed to update read state", success: false })
	}
}
