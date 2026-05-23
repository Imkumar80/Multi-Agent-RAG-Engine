import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { loginApi, logoutApi, signupApi, getMeApi, updateProfileApi } from '../utils/api'
import { useRecoilState } from 'recoil'
import { userAtom } from '../store/atoms/userAtom'
import Loading from '../components/Loading'

export type UserRole = 'guest' | 'user'

type AuthContextValue = {
	role: UserRole
	isAuthenticated: boolean
	email?: string
	firstName?: string
	lastName?: string
	id?: string
	backendUserType?: string
	login: (args: { email: string; password: string; role: Exclude<UserRole, 'guest'> }) => Promise<void>
	signup: (args: { email: string; password: string; firstName: string; lastName: string; role: Exclude<UserRole, 'guest'>; cfToken: string }) => Promise<void>
	logout: () => Promise<void>
	verified?: boolean
	checkVerificationStatus: () => Promise<void>
	// Profile fields
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
	updateProfile: (data: Partial<AuthContextValue>) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useRecoilState(userAtom)
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const initAuth = async () => {
			try {
				const res = await getMeApi()
				if (res.success) {
					setUser({
						role: 'user',
						isAuthenticated: true,
						email: res.user.email,
						firstName: res.user.firstName,
						lastName: res.user.lastName,
						id: res.user.id,
						verified: res.user.verified,
						createdAt: res.user.createdAt,
						updatedAt: res.user.updatedAt,
						backendUserType: res.user.userType,
						// Extended fields
						username: res.user.username,
						title: res.user.title,
						institution: res.user.institution,
						interests: Array.isArray(res.user.interests) ? res.user.interests.join(', ') : res.user.interests,
						bio: res.user.bio,
						phoneNumber: res.user.phoneNumber,
						city: res.user.city,
						pincode: res.user.pincode ? String(res.user.pincode) : undefined,
						avatarUrl: res.user.avatarUrl,
						isPrivate: res.user.isPrivate
					})
				}
			} catch (e) {
				// Not authenticated, stay as guest
			} finally {
				setLoading(false)
			}
		}
		initAuth()
	}, [setUser])

	const login: AuthContextValue['login'] = async ({ email, password, role }) => {
		const res = await loginApi({ email, password, role })
		setUser({
			role: 'user',
			isAuthenticated: true,
			email: res.user.email,
			firstName: res.user.firstName,
			lastName: res.user.lastName,
			id: res.user.id,
			verified: res.user.verified,
			createdAt: res.user.createdAt,
			updatedAt: res.user.updatedAt,
			backendUserType: res.user.userType
		})
	}

	const signup: AuthContextValue['signup'] = async ({ email, password, firstName, lastName, role, cfToken }) => {
		const res = await signupApi({ email, password, firstName, lastName, role, cfToken })
		setUser({
			role: 'user',
			isAuthenticated: true,
			email: res.user.email,
			firstName: res.user.firstName,
			lastName: res.user.lastName,
			id: res.user.id,
			verified: res.user.verified,
			createdAt: res.user.createdAt,
			updatedAt: res.user.updatedAt,
			backendUserType: res.user.userType
		})
	}

	const logout = async () => {
		await logoutApi()
		setUser({
			role: 'guest',
			isAuthenticated: false
		})
	}

	const checkVerificationStatus = async () => {
		const res = await getMeApi()
		if (res.success) {
			setUser(prev => ({
				...prev,
				role: 'user',
				isAuthenticated: true,
				email: res.user.email,
				firstName: res.user.firstName,
				lastName: res.user.lastName,
				id: res.user.id,
				verified: res.user.verified,
				createdAt: res.user.createdAt,
				updatedAt: res.user.updatedAt,
				backendUserType: res.user.userType,
				// Extended fields
				username: res.user.username,
				title: res.user.title,
				institution: res.user.institution,
				interests: Array.isArray(res.user.interests) ? res.user.interests.join(', ') : res.user.interests,
				bio: res.user.bio,
				phoneNumber: res.user.phoneNumber,
				city: res.user.city,
				pincode: res.user.pincode ? String(res.user.pincode) : undefined,
				avatarUrl: res.user.avatarUrl,
				isPrivate: res.user.isPrivate
			}))
		}
	}

	const updateProfile = async (data: Partial<AuthContextValue>) => {
		try {
			const res = await updateProfileApi(data)
			if (res.success) {
				setUser(prev => ({
					...prev,
					...data,
					// Ensure we keep existing fields if not in data, but data should override
					// Actually, let's merge with the response user data if available to be safe, 
					// or just trust the data passed if it was successful.
					// Ideally we should use the response from server.
					// But for now, let's just merge local updates as requested.
				}))
				// Update local storage just in case we still need it for offline or something? 
				// No, plan said to remove it.
			}
		} catch (error) {
			console.error("Failed to update profile", error)
			throw error; // Re-throw to let component handle error UI
		}
	}

	const value = useMemo<AuthContextValue>(() => ({
		role: user.role,
		isAuthenticated: user.isAuthenticated,
		email: user.email,
		firstName: user.firstName,
		lastName: user.lastName,
		id: user.id,
		backendUserType: user.backendUserType,
		login,
		signup,
		logout,
		verified: user.verified,
		checkVerificationStatus,
		username: user.username,
		title: user.title,
		institution: user.institution,
		interests: user.interests,
		bio: user.bio,
		phoneNumber: user.phoneNumber,
		pincode: user.pincode,
		city: user.city,
		avatarUrl: user.avatarUrl,
		professionalRole: user.professionalRole,
		isPrivate: user.isPrivate,
		updateProfile
	}), [user])

	if (loading) {
		return <Loading />
	}

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	)
}

export function useAuth() {
	const ctx = useContext(AuthContext)
	if (!ctx) throw new Error('useAuth must be used within AuthProvider')
	return ctx
}

// Helper to save profile data to local storage (mock backend) - Removed
// function saveProfileToStorage(email: string, data: any) { ... }

// function loadProfileFromStorage(email: string) { ... }
