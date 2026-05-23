import { Response } from "express"

const THIRTY_DAYS_IN_MS = 30 * 24 * 60 * 60 * 1000
const isProduction = process.env.NODE_ENV === "production"

const baseCookieOptions = {
	httpOnly: true,
	secure: isProduction,
	sameSite: isProduction ? "none" as const : "lax" as const,
	maxAge: THIRTY_DAYS_IN_MS,
	path: "/"
}

export const AUTH_COOKIE_NAME = "resonav_session"

export function attachAuthCookie(res: Response, token: string) {
	res.cookie(AUTH_COOKIE_NAME, token, baseCookieOptions)
}

export function clearAuthCookie(res: Response) {
	res.clearCookie(AUTH_COOKIE_NAME, {
		...baseCookieOptions,
		maxAge: 0
	})
}

