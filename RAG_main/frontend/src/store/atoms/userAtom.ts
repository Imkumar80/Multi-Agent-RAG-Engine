import { atom } from 'recoil'

export type UserRole = 'guest' | 'user'

export interface UserState {
	role: UserRole
	isAuthenticated: boolean
	email?: string
	firstName?: string
	lastName?: string
	id?: string
	verified?: boolean
	createdAt?: string
	updatedAt?: string
	backendUserType?: string
	username?: string
	title?: string
	institution?: string
	interests?: string
	bio?: string
	phoneNumber?: string
	pincode?: string
	city?: string
	avatarUrl?: string
	professionalRole?: string
	isPrivate?: boolean
}

export const userAtom = atom<UserState>({
	key: 'userAtom',
	default: {
		role: 'guest',
		isAuthenticated: false
	}
})
