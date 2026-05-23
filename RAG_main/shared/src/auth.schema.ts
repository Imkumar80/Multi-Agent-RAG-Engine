import { z } from "zod";
import { userType } from ".";

export const signUpSchema = z.object({
	email: z.string().email().nonempty("Email is required"),
	password: z.string().min(4, "Password must be at least 4 characters long").nonempty("Password is required"),
	firstName: z.string().nonempty("First name is required"),
	lastName: z.string().nonempty("Last name is required"),
});

export const loginSchema = z.object({
	email: z.string().email().nonempty("Email is required"),
	password: z.string().min(4, "Password must be at least 4 characters long").nonempty("Password is required"),
});

export type SignUpSchema = z.infer<typeof signUpSchema>;
export type LoginSchema = z.infer<typeof loginSchema>;
