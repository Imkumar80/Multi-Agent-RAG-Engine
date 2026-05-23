const MAX_MESSAGE_LENGTH = 2000

export function makePairKey(userAId: string, userBId: string) {
	return [userAId, userBId].sort().join(":")
}

export function normalizeMessageBody(body: string) {
	return body.trim()
}

export function isMessageBodyValid(body: string) {
	const normalized = normalizeMessageBody(body)
	return normalized.length > 0 && normalized.length <= MAX_MESSAGE_LENGTH
}

export function getMaxMessageLength() {
	return MAX_MESSAGE_LENGTH
}
