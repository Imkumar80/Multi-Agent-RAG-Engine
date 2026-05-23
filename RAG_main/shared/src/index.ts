export enum userType {
    researcher = "researcher",
    intern = "intern",
    mentor = "mentor"
}

export { signUpSchema, loginSchema, type SignUpSchema, type LoginSchema } from "./auth.schema";