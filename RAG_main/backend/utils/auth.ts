import type { Request } from "express"
import type { Socket } from "socket.io"
import jwt from "jsonwebtoken"
import { AUTH_COOKIE_NAME } from "./cookies"

type TokenPayload = jwt.JwtPayload & { id?: string }

function parseCookieHeader(header: string | undefined) {
	if (!header) return {}
	return header.split(";").reduce<Record<string, string>>((acc, part) => {
		const [rawKey, ...rest] = part.trim().split("=")
		if (!rawKey) return acc
		acc[rawKey] = decodeURIComponent(rest.join("=") || "")
		return acc
	}, {})
}

export function getUserIdFromToken(token: string | undefined, secret?: string) {
	if (!token) return null
	const jwtSecret = secret ?? process.env.JWT_SECRET
	if (!jwtSecret) return null
	try {
		const payload = jwt.verify(token, jwtSecret) as TokenPayload
		return payload?.id ?? null
	} catch {
		return null
	}
}

export function getUserIdFromRequest(req: Request) {
	const token = req.cookies?.[AUTH_COOKIE_NAME] ?? parseCookieHeader(req.headers.cookie)[AUTH_COOKIE_NAME]
	return getUserIdFromToken(token)
}

export function getUserIdFromSocket(socket: Socket) {
	const cookieHeader = socket.handshake.headers.cookie
	const token = parseCookieHeader(cookieHeader)[AUTH_COOKIE_NAME]
	return getUserIdFromToken(token)
}
