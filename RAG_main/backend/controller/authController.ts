import { Request, Response } from "express"
import { ResponseStatus } from "../utils/values"
import bcrypt, { hash } from 'bcrypt';
import { removePassword } from "../utils/functions"
import { attachAuthCookie, clearAuthCookie, AUTH_COOKIE_NAME } from "../utils/cookies"
import jwt from 'jsonwebtoken'
import { loginSchema, signUpSchema } from "@rishit1275/resonav-shared-schemas/dist/auth.schema"
import { sendVerificationEmail } from "../utils/sendEmail"
import { prisma } from "../utils/prisma"
import { Prisma } from "../generated/prisma" // for typescript aste

const SALT_ROUNDS = 12;
const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRATION = '30d';

if (!JWT_SECRET) { throw new Error("JWT password environment variable not set") }

export const signup = async (req: Request, res: Response) => {
    try {
        const result = signUpSchema.safeParse(req.body);

        if (!result.success) {
            const formattedErrors = result.error.format();

            return res.status(ResponseStatus.clientError).json({ msg: "Invalid input", errors: formattedErrors, success: false });
        }

        const { email, password, firstName, lastName } = result.data
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // Generate a temporary unique username using email prefix and random string
        const username = `${email.split('@')[0]}_${Math.floor(1000 + Math.random() * 9000)}`;

        const createdUser = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                lastName,
                username
            }
        })

        const token = jwt.sign({ id: createdUser.id, email: createdUser.email, userType: createdUser.userType }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION })
        attachAuthCookie(res, token);
        await sendVerificationEmail(email, createdUser.id, createdUser.userType);
        return res.status(ResponseStatus.success).json({ msg: "User created successfully", token, user: removePassword(createdUser), redirect: true, success: true })
    } catch (error: any) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === "P2002") {
                return res.status(ResponseStatus.clientError).json({ msg: `The user already exists`, success: false });
            }
        } else {
            return res.status(ResponseStatus.internalServerError).json({ msg: "Internal Server Error", success: false });
        }
    }
}

export const login = async (req: Request, res: Response) => {
    try {
        const result = loginSchema.safeParse(req.body);

        if (!result.success) {
            const formattedErrors = result.error.format();

            return res.status(ResponseStatus.clientError).json({ msg: "Invalid Input", errors: formattedErrors, success: false });
        }

        const { email, password } = result.data;
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user?.password) {
            return res.status(ResponseStatus.unauthorized).json({ msg: "Invalid Credentials", success: false });
        }

        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(ResponseStatus.unauthorized).json({ msg: "Invalid Credentials", success: false })
        }

        if (user.verified) {
            const token = jwt.sign({ id: user.id, email: user.email, userType: user.userType }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
            attachAuthCookie(res, token);
            return res.status(ResponseStatus.success).json({ msg: "Login: Verified", token, user: removePassword(user), success: true })
        }
        else {
            if (typeof user.id === "string") {
                const token = jwt.sign({ id: user.id, email: user.email, userType: user.userType }, JWT_SECRET, { expiresIn: TOKEN_EXPIRATION });
                attachAuthCookie(res, token);
                await sendVerificationEmail(email, user.id, user.userType);
                return res.status(ResponseStatus.success).json({ msg: "Login: Verification Required", token, user: removePassword(user), redirect: true, success: true })
            }
        }

        return res.send("Okay")

    } catch (error) {
        console.error(error);
        return res.status(ResponseStatus.internalServerError).json({ msg: "Internal Server Error", success: false })
    }
}

export const verifyEmail = async (req: Request, res: Response) => {
    const token = req.query.token;

    if (!token || typeof token !== 'string') {
        return res.status(ResponseStatus.clientError).json({ msg: 'Token not available or invalid', success: false });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);

        if (typeof payload !== 'object' || payload === null) {
            return res.status(ResponseStatus.clientError).json({ msg: "Invalid Token Payload", success: false });
        }

        const { id } = payload as jwt.JwtPayload;

        if (!id || typeof id !== "string") {
            return res.status(ResponseStatus.clientError).json({ msg: "Invalid Token Payload", success: false });
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: { verified: true }
        });

        return res.status(ResponseStatus.success).json({ msg: `Verified ${updatedUser.userType}`, user: removePassword(updatedUser), success: true })
    } catch (error) {
        console.error(error);
        return res.status(ResponseStatus.clientError).json({ msg: "Invalid Token", success: false })
    }

}

export const resendVerification = async (req: Request, res: Response) => {
    const token = req.cookies[AUTH_COOKIE_NAME];

    if (!token) {
        return res.status(ResponseStatus.unauthorized).json({ msg: "Not authenticated", success: false });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (typeof payload !== 'object' || payload === null) {
            return res.status(ResponseStatus.unauthorized).json({ msg: "Invalid Token", success: false });
        }

        const { id, email, userType } = payload as jwt.JwtPayload;

        if (!id || typeof id !== "string") {
            return res.status(ResponseStatus.unauthorized).json({ msg: "Invalid Token Payload", success: false });
        }

        const user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
            return res.status(ResponseStatus.unauthorized).json({ msg: "User not found", success: false });
        }

        if (user.verified) {
            return res.status(ResponseStatus.clientError).json({ msg: "User already verified", success: false });
        }

        await sendVerificationEmail(email, id, userType);
        return res.status(ResponseStatus.success).json({ msg: "Verification email sent", success: true });

    } catch (error) {
        console.error(error);
        return res.status(ResponseStatus.internalServerError).json({ msg: "Internal Server Error", success: false });
    }
}

export const logout = async (_req: Request, res: Response) => {
    clearAuthCookie(res);
    return res.status(ResponseStatus.success).json({ msg: "Logged out", success: true })
}

export const getMe = async (req: Request, res: Response) => {
    const token = req.cookies[AUTH_COOKIE_NAME];

    if (!token) {
        return res.status(ResponseStatus.unauthorized).json({ msg: "Not authenticated", success: false });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);

        if (typeof payload !== 'object' || payload === null) {
            return res.status(ResponseStatus.unauthorized).json({ msg: "Invalid Token", success: false });
        }

        const { id } = payload as jwt.JwtPayload;
        if (!id || typeof id !== "string") {
            return res.status(ResponseStatus.unauthorized).json({ msg: "Invalid Token Payload", success: false });
        }

        const user = await prisma.user.findUnique({ where: { id } });

        if (!user) {
            return res.status(ResponseStatus.unauthorized).json({ msg: "User not found", success: false });
        }

        return res.status(ResponseStatus.success).json({ msg: "Authenticated", user: removePassword(user), success: true });

    } catch (error) {
        return res.status(ResponseStatus.unauthorized).json({ msg: "Invalid Token", success: false });
    }
}

import { z } from "zod";

const updateUserSchema = z.object({
    username: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    title: z.string().optional(),
    institution: z.string().optional(),
    bio: z.string().optional(),
    interests: z.union([z.string(), z.array(z.string())]).optional(), // Handle comma string or array
    city: z.string().optional(),
    pincode: z.union([z.string(), z.number()]).optional(),
    phoneNumber: z.string().optional(),
    isPrivate: z.boolean().optional(),
    userType: z.enum(['Intern', 'Researcher', 'Mentor']).optional(),
});

export const updateMe = async (req: Request, res: Response) => {
    const token = req.cookies[AUTH_COOKIE_NAME];

    if (!token) {
        return res.status(ResponseStatus.unauthorized).json({ msg: "Not authenticated", success: false });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        if (typeof payload !== 'object' || payload === null) {
            return res.status(ResponseStatus.unauthorized).json({ msg: "Invalid Token", success: false });
        }

        const { id } = payload as jwt.JwtPayload;
        if (!id || typeof id !== "string") {
            return res.status(ResponseStatus.unauthorized).json({ msg: "Invalid Token Payload", success: false });
        }

        // Validate input
        const parseResult = updateUserSchema.safeParse(req.body);
        if (!parseResult.success) {
            const formattedErrors = parseResult.error.format();
            return res.status(ResponseStatus.clientError).json({ msg: "Invalid Input", errors: formattedErrors, success: false });
        }

        const data = parseResult.data;
        const updateData: any = { ...data };

        // Process special fields
        if (data.pincode) {
            updateData.pincode = typeof data.pincode === 'string'
                ? parseInt(data.pincode, 10) || null
                : data.pincode;
        }

        if (data.interests) {
            updateData.interests = typeof data.interests === 'string'
                ? data.interests.split(',').map(s => s.trim()).filter(Boolean)
                : data.interests;
        }

        const updatedUser = await prisma.user.update({
            where: { id },
            data: updateData
        });

        return res.status(ResponseStatus.success).json({
            msg: "Profile updated successfully",
            user: removePassword(updatedUser),
            success: true
        });

    } catch (error: any) {
        console.error("Update profile error:", error);
        if (error.code === 'P2002') { // Unique constraint violation (e.g. username)
            return res.status(ResponseStatus.clientError).json({ msg: "Username already taken", success: false });
        }
        return res.status(ResponseStatus.internalServerError).json({ msg: "Internal Server Error", success: false });
    }
}