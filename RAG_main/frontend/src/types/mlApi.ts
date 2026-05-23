export type MlResearchSource = 'arxiv' | 'semantic_scholar' | 'crossref' | 'springer'
export type MlChatRole = 'user' | 'assistant' | 'system'
export type MlChatSessionStatus = 'ready'
export type MlSessionId = number
export type MlSessionIdString = `${number}`

export interface MlResearchSearchRequest {
	query: string
	source?: MlResearchSource
	limit?: number
	offset?: number
}

export interface MlResearchPaper {
	paper_id: number
	title: string
	authors: string[]
	abstract?: string
	source: string
	url: string
}

export interface MlResearchSearchResponse {
	papers: MlResearchPaper[]
	total: number
	source: string
	message?: string
}

export interface MlCreateChatSessionRequest {
	paper_id: number
	user_id: string
	session_title: string
}

export interface MlCreateChatSessionResponse {
	session_id: MlSessionIdString
	user_id: string
	paper_id: number
	created_at: string
	status: MlChatSessionStatus
	id?: MlSessionId | MlSessionIdString
}

export interface MlAddChatMessageRequest {
	session_id: MlSessionId
	content: string
	metadata?: Record<string, unknown>
}

export interface MlAddChatMessageResponse {
	message_id: MlSessionId
	session_id: MlSessionIdString
	role: MlChatRole
	content: string
	timestamp: string
	status: string
}

export interface MlConversationMessage {
	id: MlSessionId
	session_id: MlSessionId
	role: MlChatRole
	content: string
	created_at: string
	metadata?: Record<string, unknown>
}

export interface MlConversationHistoryResponse {
	session_id: MlSessionIdString
	messages: MlConversationMessage[]
	total: number
	limit: number
	offset: number
}

export interface MlSessionPaper {
	paper_id?: number
	title?: string
	authors?: string[]
	abstract?: string
	source?: string
	url?: string
	[key: string]: unknown
}

export interface MlChatSessionInfoResponse {
	session_id: MlSessionId
	paper: MlSessionPaper | null
	message_count: number
	first_message_at: string | null
	last_message_at: string | null
	session_duration_minutes: number
}
