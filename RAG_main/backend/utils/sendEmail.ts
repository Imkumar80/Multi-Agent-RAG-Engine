import jwt from "jsonwebtoken"
import nodemailer from "nodemailer"
import { UserType } from "../generated/prisma";

const BACKEND_BASE_URL = process.env.BACKEND_BASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRATION = '1d';

export async function sendVerificationEmail(userEmail: string, userId: string, role: UserType) {
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const token = jwt.sign({ id: userId, userType: role }, JWT_SECRET as string, { expiresIn: TOKEN_EXPIRATION });

    const verificationLink = `${BACKEND_BASE_URL}/api/v1/auth/verify-email/?token=${token}`;

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: userEmail,
        subject: 'Verify your email - Resonav',
        html: `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; -webkit-font-smoothing: antialiased; }
        .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
        .header { background-color: #ffffff; padding: 32px; text-align: center; border-bottom: 1px solid #f0f0f0; }
        .logo { height: 48px; width: auto; display: inline-block; }
        .content { padding: 48px 32px; text-align: center; }
        .title { color: #111111; font-size: 28px; margin: 0 0 16px 0; font-weight: 700; letter-spacing: -0.5px; }
        .text { color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 32px 0; }
        .button { display: inline-block; background-color: #000000; color: #ffffff !important; padding: 16px 32px; text-decoration: none; border-radius: 30px; font-weight: 600; font-size: 16px; transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .button:hover { background-color: #333333; transform: translateY(-1px); box-shadow: 0 6px 16px rgba(0,0,0,0.25); }
        .footer { background-color: #fafafa; padding: 24px; text-align: center; color: #888888; font-size: 12px; border-top: 1px solid #f0f0f0; }
        .link-fallback { margin-top: 40px; padding-top: 24px; border-top: 1px solid #f0f0f0; text-align: left; }
        .link-text { color: #888888; font-size: 13px; margin-bottom: 8px; }
        .link-url { color: #000000; text-decoration: underline; font-size: 12px; word-break: break-all; display: block; line-height: 1.4; }
        
        @media (prefers-color-scheme: dark) {
            body { background-color: #111111 !important; }
            .container { background-color: #1e1e1e !important; box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important; border: 1px solid #333333 !important; }
            .header { background-color: #1e1e1e !important; border-bottom: 1px solid #333333 !important; }
            .title { color: #ffffff !important; }
            .text { color: #cccccc !important; }
            .button { background-color: #ffffff !important; color: #000000 !important; box-shadow: 0 4px 12px rgba(255,255,255,0.1) !important; }
            .button:hover { background-color: #e0e0e0 !important; }
            .footer { background-color: #252525 !important; color: #888888 !important; border-top: 1px solid #333333 !important; }
            .link-fallback { border-top: 1px solid #333333 !important; }
            .link-text { color: #888888 !important; }
            .link-url { color: #4a9eff !important; }
        }
        
        @media only screen and (max-width: 600px) {
            .container { width: 100% !important; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
            .content { padding: 32px 20px !important; }
            .header { padding: 24px !important; }
            .title { font-size: 24px !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="${BACKEND_BASE_URL}/assets/logo.png" alt="Resonav" class="logo">
        </div>
        <div class="content">
            <h1 class="title">Welcome to Resonav!</h1>
            <p class="text">
                Hello! Thanks for signing up as a <strong>${role}</strong>. <br>
                We're excited to accompany you on your journey. Please verify your email address to activate your account and get started.
            </p>
            <a href="${verificationLink}" class="button">Verify Email Address</a>
            
            <div class="link-fallback">
                <p class="link-text">If the button above doesn't work, copy and paste the following link into your browser:</p>
                <a href="${verificationLink}" class="link-url">${verificationLink}</a>
            </div>
        </div>
        <div class="footer">
            <p style="margin: 0 0 10px 0;">&copy; ${new Date().getFullYear()} Resonav. All rights reserved.</p>
            <p style="margin: 0;">This email was sent to ${userEmail}. If you didn't request this account, you can safely ignore this email.</p>
        </div>
    </div>
</body>
</html>
		`
    };

    await transporter.sendMail(mailOptions);
}