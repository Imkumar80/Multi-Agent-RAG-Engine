import axios from 'axios'
import { authEndpoints, chatEndpoints, mlEndpoints } from '../lib/values'
import type {
	MlAddChatMessageRequest,
	MlAddChatMessageResponse,
	MlChatSessionInfoResponse,
	MlConversationHistoryResponse,
	MlCreateChatSessionRequest,
	MlCreateChatSessionResponse,
	MlResearchSearchRequest,
	MlResearchSearchResponse
} from '../types/mlApi'

// Regular axios instance for backend API calls (with credentials)
const axiosWithCredentials = axios.create()
axiosWithCredentials.defaults.withCredentials = true

// Separate axios instance for ML backend (no credentials)
const axiosML = axios.create()
axiosML.defaults.withCredentials = false

// Use axiosWithCredentials as default for backward compatibility
const axiosDefault = axiosWithCredentials

function assertNonEmptyString(value: string, fieldName: string): string {
	const trimmed = value.trim()
	if (!trimmed) {
		throw new Error(`${fieldName} is required.`)
	}
	return trimmed
}

function assertPositiveInteger(value: number, fieldName: string): number {
	if (!Number.isInteger(value) || value <= 0) {
		throw new Error(`${fieldName} must be a positive integer.`)
	}
	return value
}

function assertNonNegativeInteger(value: number, fieldName: string): number {
	if (!Number.isInteger(value) || value < 0) {
		throw new Error(`${fieldName} must be a non-negative integer.`)
	}
	return value
}

// Regular axios instance for backend API calls (with credentials)
const axiosWithCredentials = axios.create()
axiosWithCredentials.defaults.withCredentials = true

// Separate axios instance for ML backend (no credentials)
const axiosML = axios.create()
axiosML.defaults.withCredentials = false

// Use axiosWithCredentials as default for backward compatibility
const axiosDefault = axiosWithCredentials

type Role = 'user'
type AuthResponse = {
	success: boolean
	user: {
		userType: string
		email: string
		firstName: string
		lastName: string
		id: string
		verified: boolean
		createdAt: string
		updatedAt: string
		// Extended profile fields
		username: string
		title?: string
		institution?: string
		interests?: string[] | string
		bio?: string
		phoneNumber?: string
		city?: string
		pincode?: number
		avatarUrl?: string
		isPrivate?: boolean
	}
}

export async function loginApi(data: { email: string; password: string; role: Role }) {
	const res = await axiosDefault.post(authEndpoints.loginEndpoint, {
		email: data.email,
		password: data.password,
		userType: data.role
	})
	return res.data as AuthResponse
}

export async function signupApi(data: { email: string; password: string; firstName: string; lastName: string; role: Role; cfToken: string }) {
	const res = await axiosDefault.post(authEndpoints.signUpEndpoint, {
		email: data.email,
		password: data.password,
		firstName: data.firstName,
		lastName: data.lastName,
		userType: data.role,
		cfToken: data.cfToken
	})
	return res.data as AuthResponse
}

export async function logoutApi() {
	await axiosDefault.post(authEndpoints.logoutEndpoint, {})
}

export async function getMeApi() {
	const res = await axiosDefault.get(authEndpoints.meEndpoint)
	return res.data as AuthResponse
}

export async function updateProfileApi(data: Record<string, unknown>) {
export async function updateProfileApi(data: any) {
	const res = await axiosDefault.put(authEndpoints.meEndpoint, data)
	return res.data as AuthResponse
}

export async function resendVerificationApi() {
	const res = await axiosDefault.post(authEndpoints.resendVerificationEndpoint)
	return res.data
}



// Social Features
export async function searchUsersApi(query: string) {
	const res = await axiosDefault.get(`${authEndpoints.usersEndpoint}/search?q=${query}`)
	return res.data
}

export async function followUserApi(id: string) {
	const res = await axiosDefault.post(`${authEndpoints.usersEndpoint}/${id}/follow`)
	return res.data
}

export async function unfollowUserApi(id: string) {
	const res = await axiosDefault.delete(`${authEndpoints.usersEndpoint}/${id}/follow`)
	return res.data
}

export async function getPublicProfileApi(username: string) {
	const res = await axiosDefault.get(`${authEndpoints.usersEndpoint}/${username}`)
	return res.data
}

export async function getFollowersApi(username: string) {
	const res = await axiosDefault.get(`${authEndpoints.usersEndpoint}/${username}/followers`)
	return res.data
}

export async function getFollowingApi(username: string) {
	const res = await axiosDefault.get(`${authEndpoints.usersEndpoint}/${username}/following`)
	return res.data
}

export async function getRecommendationsApi() {
	const res = await axiosDefault.get(`${authEndpoints.usersEndpoint}/recommendations`)
	return res.data
}

export async function getPincodeRecommendationsApi() {
	const res = await axiosDefault.get(`${authEndpoints.usersEndpoint}/pincode-recommendations`)
	return res.data
}

// Chat
export async function getConversationsApi() {
	const res = await axiosDefault.get(chatEndpoints.conversationsEndpoint)
	return res.data
}

export async function getMessagesApi(conversationId: string, cursor?: string) {
	const baseUrl = `${chatEndpoints.conversationsEndpoint}/${conversationId}/messages`
	const url = cursor ? `${baseUrl}?cursor=${cursor}` : baseUrl
	const res = await axiosDefault.get(url)
	return res.data
}

export async function markConversationReadApi(conversationId: string) {
	const res = await axiosDefault.post(`${chatEndpoints.conversationsEndpoint}/${conversationId}/read`)
	return res.data
}

// ML Research APIs
export async function searchPapersApi(data: MlResearchSearchRequest): Promise<MlResearchSearchResponse> {
	const payload: MlResearchSearchRequest = {
		...data,
		query: assertNonEmptyString(data.query, 'query'),
		...(data.limit !== undefined ? { limit: assertPositiveInteger(data.limit, 'limit') } : {}),
		...(data.offset !== undefined ? { offset: assertNonNegativeInteger(data.offset, 'offset') } : {})
	}

	const res = await axiosML.post<MlResearchSearchResponse>(mlEndpoints.research.search, payload)
	return res.data
}

// ML Chat APIs
export async function createChatSessionApi(data: MlCreateChatSessionRequest): Promise<MlCreateChatSessionResponse> {
	const payload: MlCreateChatSessionRequest = {
		paper_id: assertPositiveInteger(data.paper_id, 'paper_id'),
		user_id: assertNonEmptyString(data.user_id, 'user_id'),
		session_title: assertNonEmptyString(data.session_title, 'session_title')
	}

	const res = await axiosML.post<MlCreateChatSessionResponse>(mlEndpoints.chat.sessions, payload)
	return res.data
}

export async function addMessageToSessionApi(data: MlAddChatMessageRequest): Promise<MlAddChatMessageResponse> {
	const payload: MlAddChatMessageRequest = {
		...data,
		session_id: assertPositiveInteger(data.session_id, 'session_id'),
		content: assertNonEmptyString(data.content, 'content')
	}

	const res = await axiosML.post<MlAddChatMessageResponse>(mlEndpoints.chat.messages, payload)
	return res.data
}

export async function getConversationHistoryApi(sessionId: number, limit: number = 50, offset: number = 0): Promise<MlConversationHistoryResponse> {
	const normalizedSessionId = assertPositiveInteger(sessionId, 'session_id')
	const normalizedLimit = assertPositiveInteger(limit, 'limit')
	const normalizedOffset = assertNonNegativeInteger(offset, 'offset')

	const res = await axiosML.get<MlConversationHistoryResponse>(mlEndpoints.chat.conversation(normalizedSessionId), {
		params: { limit: normalizedLimit, offset: normalizedOffset }
	})
	return res.data
}

export async function getSessionInfoApi(sessionId: number): Promise<MlChatSessionInfoResponse> {
	const normalizedSessionId = assertPositiveInteger(sessionId, 'session_id')
	const res = await axiosML.get<MlChatSessionInfoResponse>(mlEndpoints.chat.session(normalizedSessionId))
export async function searchPapersApi(data: { query: string; source?: string; limit?: number; offset?: number }) {
	const res = await axiosML.post(mlEndpoints.research.search, data)
	return res.data
}

export async function searchArxivApi(query: string, limit: number = 10, offset: number = 0) {
	const res = await axiosML.get(mlEndpoints.research.arxiv, { params: { query, limit, offset } })
	return res.data
}

export async function searchSemanticScholarApi(query: string, limit: number = 10, offset: number = 0) {
	const res = await axiosML.get(mlEndpoints.research.semanticScholar, { params: { query, limit, offset } })
	return res.data
}

export async function searchCrossrefApi(query: string, maxResults: number = 10) {
	const res = await axiosML.get(mlEndpoints.research.crossref, { params: { query, max_results: maxResults } })
	return res.data
}

export async function searchSpringerApi(query: string, maxResults: number = 10) {
	const res = await axiosML.get(mlEndpoints.research.springer, { params: { query, max_results: maxResults } })
	return res.data
}

// ML Chat APIs
export async function createChatSessionApi(data: { paper_id: number; user_id: string; session_title: string }) {
	const res = await axiosML.post(mlEndpoints.chat.sessions, data)
	return res.data
}

export async function addMessageToSessionApi(data: { session_id: number; content: string; metadata?: any }) {
	const res = await axiosML.post(mlEndpoints.chat.messages, data)
	return res.data
}

export async function getConversationHistoryApi(sessionId: number, limit: number = 50, offset: number = 0) {
	const res = await axiosML.get(mlEndpoints.chat.conversation(sessionId), { params: { limit, offset } })
	return res.data
}

export async function getSessionInfoApi(sessionId: number) {
	const res = await axiosML.get(mlEndpoints.chat.session(sessionId))
	return res.data
}


// Paper selection endpoint to save papers to system
export async function selectPaperApi(data: {
	title: string
	authors: string[]
	abstract?: string
	summary?: string
	url: string
	source: string
	published_date?: string
	content?: string
}) {
	// Build query parameters - FastAPI expects multiple 'authors' params for arrays
	const params = new URLSearchParams()
	params.append('title', data.title)
	data.authors.forEach(author => params.append('authors', author))
	params.append('abstract', data.abstract || data.summary || '')
	params.append('url', data.url)
	params.append('source', data.source)
	if (data.published_date) params.append('published_date', data.published_date)
	if (data.content) params.append('content', data.content)

	const res = await axiosML.post(`${mlEndpoints.research.select}?${params.toString()}`)
	return res.data
}