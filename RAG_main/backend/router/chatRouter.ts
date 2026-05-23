import express from "express"
import { getMessages, listConversations, markConversationRead } from "../controller/chatController"

const chatRouter = express.Router()

chatRouter.get("/conversations", listConversations)
chatRouter.get("/conversations/:id/messages", getMessages)
chatRouter.post("/conversations/:id/read", markConversationRead)

export default chatRouter
