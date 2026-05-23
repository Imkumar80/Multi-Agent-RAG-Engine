import { User } from "../generated/prisma"

export function removePassword(obj: User) {
	const { password, ...rest } = obj;
	return rest;
}