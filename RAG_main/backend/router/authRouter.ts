import express, { Request, Response, NextFunction } from 'express'
import { login, signup, verifyEmail, logout, getMe, resendVerification, updateMe } from '../controller/authController'
import axios from 'axios'

const authRouter = express.Router()

authRouter.post("/signup", verifyTurnstile, signup)
authRouter.post("/login", login)
authRouter.post("/logout", logout)
authRouter.get("/verify-email", verifyEmail)
authRouter.post("/resend-verification", resendVerification)
authRouter.get("/me", getMe)
authRouter.put("/me", updateMe)



async function verifyTurnstile(req: Request, res: Response, next: NextFunction) {
	// try {
	// 	const token = req.body["cfToken"]; // frontend should send this

	// 	if (!token) {
	// 		return res.status(400).json({ error: "Missing Turnstile token" });
	// 	}

	// 	// Verify with Cloudflare
	// 	const response = await axios.post(
	// 		"https://challenges.cloudflare.com/turnstile/v0/siteverify",
	// 		new URLSearchParams({
	// 			secret: process.env.TURNSTILE_SECRET_KEY ?? "", // set in your .env
	// 			response: String(token),
	// 		})
	// 	);

	// 	if (response.data.success) {
	// 		next();
	// 	} else {
	// 		return res.status(403).json({
	// 			error: "Invalid Turnstile token",
	// 			details: response.data["error-codes"] || [],
	// 		});
	// 	}
	// } catch (err: any) {
	// 	console.error("Turnstile verification error:", err.message);
	// 	return res.status(500).json({ error: "Turnstile verification failed" });
	// }
	next();
}

export default authRouter