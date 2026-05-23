export const baseURL = "http://localhost:3000"
export const mlBaseURL = "http://localhost:8001"

export const authEndpoints = {
	signUpEndpoint: `${baseURL}/api/v1/auth/signup`,
	loginEndpoint: `${baseURL}/api/v1/auth/login`,
	meEndpoint: `${baseURL}/api/v1/auth/me`,
	verifyEndpoint: `${baseURL}/api/v1/auth/verify-email`,
	resendVerificationEndpoint: `${baseURL}/api/v1/auth/resend-verification`,
	logoutEndpoint: `${baseURL}/api/v1/auth/logout`,
	usersEndpoint: `${baseURL}/api/v1/users`
}

export const chatEndpoints = {
	base: `${baseURL}/api/v1/chat`,
	conversationsEndpoint: `${baseURL}/api/v1/chat/conversations`
}

export const mlEndpoints = {
	research: {
		search: `${mlBaseURL}/api/research/search`
		search: `${mlBaseURL}/api/research/search`,
		arxiv: `${mlBaseURL}/api/research/arxiv`,
		semanticScholar: `${mlBaseURL}/api/research/semantic-scholar`,
		crossref: `${mlBaseURL}/api/research/crossref`,
		springer: `${mlBaseURL}/api/research/springer`,
		select: `${mlBaseURL}/api/research/select`
	},
	chat: {
		sessions: `${mlBaseURL}/api/chat/sessions`,
		messages: `${mlBaseURL}/api/chat/messages`,
		session: (id: number | string) => `${mlBaseURL}/api/chat/sessions/${id}`,
		conversation: (id: number | string) => `${mlBaseURL}/api/chat/sessions/${id}/messages`
		session: (id: number) => `${mlBaseURL}/api/chat/sessions/${id}`,
		conversation: (id: number) => `${mlBaseURL}/api/chat/sessions/${id}/messages`
	}
}
