import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Turnstile from "react-turnstile";
import { X, LogIn } from 'lucide-react'

type Role = 'user'

export default function Signup() {
	const { signup } = useAuth()
	const navigate = useNavigate()
	const [form, setForm] = useState({
		firstName: '',
		lastName: '',
		email: '',
		password: '',
		confirmPassword: '',
		role: 'user' as Role,
		cfToken: ""
	})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [showUserExistsModal, setShowUserExistsModal] = useState(false)

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault()
		if (form.password !== form.confirmPassword) {
			setError("Passwords do not match");
			return;
		}
		setError(null)
		setLoading(true)
		try {
			await signup(form)
			const dest = `/dashboard`
			navigate(dest, { replace: true })
		} catch (err: any) {
			const errorMsg = err?.response?.data?.msg || err?.response?.data?.message || 'Failed to sign up'
			if (errorMsg === "The user already exists") {
				setShowUserExistsModal(true)
			} else {
				setError(errorMsg)
			}
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-squared-pattern">
			<div className="max-w-md w-full space-y-8 bg-white p-10 rounded-lg border border-gray-200 shadow-sm">
				<div>
					<h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900">
						Create your account
					</h2>
					<p className="mt-2 text-center text-md text-gray-600">
						Already have an account?{' '}
						<Link to="/login" className="font-medium text-primary hover:text-accent">
							Sign in
						</Link>
					</p>
				</div>
				<form className="mt-8 space-y-6" onSubmit={onSubmit}>
					<div className="grid grid-cols-2 gap-6">
						<div>
							<label htmlFor="first-name" className="text-lg font-medium text-gray-700">
								First Name
							</label>
							<input
								id="first-name"
								name="firstName"
								type="text"
								autoComplete="given-name"
								required
								className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-lg"
								placeholder="First Name"
								value={form.firstName}
								onChange={(e) => setForm({ ...form, firstName: e.target.value })}
							/>
						</div>
						<div>
							<label htmlFor="last-name" className="text-lg font-medium text-gray-700">
								Last Name
							</label>
							<input
								id="last-name"
								name="lastName"
								type="text"
								autoComplete="family-name"
								required
								className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-lg"
								placeholder="Last Name"
								value={form.lastName}
								onChange={(e) => setForm({ ...form, lastName: e.target.value })}
							/>
						</div>
					</div>
					<div>
						<label htmlFor="email-address" className="text-lg font-medium text-gray-700">
							Email address
						</label>
						<input
							id="email-address"
							name="email"
							type="email"
							autoComplete="email"
							required
							className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-lg"
							placeholder="Email address"
							value={form.email}
							onChange={(e) => setForm({ ...form, email: e.target.value })}
						/>
					</div>
					<div>
						<label htmlFor="password" className="text-lg font-medium text-gray-700">
							Password
						</label>
						<input
							id="password"
							name="password"
							type="password"
							autoComplete="new-password"
							required
							className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-lg"
							placeholder="Password"
							value={form.password}
							onChange={(e) => setForm({ ...form, password: e.target.value })}
						/>
					</div>
					<div>
						<label htmlFor="confirm-password" className="text-lg font-medium text-gray-700">
							Confirm Password
						</label>
						<input
							id="confirm-password"
							name="confirmPassword"
							type="password"
							autoComplete="new-password"
							required
							className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-lg"
							placeholder="Confirm Password"
							value={form.confirmPassword}
							onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
						/>
					</div>

					<div className="hidden">
						<input type="hidden" name="role" value="user" />
					</div>

					{error && (
						<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
							<strong className="font-bold">Error:</strong>
							<span className="block sm:inline"> {error}</span>
						</div>
					)}

					<Turnstile
						sitekey="0x4AAAAAAB4jjDkV3GuJcEed"
						onVerify={(t) => setForm({ ...form, cfToken: t })}
					/>

					<div>
						<button
							type="submit"
							disabled={loading}
							className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-medium rounded-md text-white bg-primary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
						>
							{loading ? 'Creating account...' : 'Create Account'}
						</button>
					</div>
				</form>
			</div>

			{/* User Already Exists Modal */}
			{
				showUserExistsModal && (
					<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
						<div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
							<button
								onClick={() => setShowUserExistsModal(false)}
								className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
							>
								<X size={24} />
							</button>

							<div className="text-center">
								<div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
									<LogIn className="h-6 w-6 text-yellow-600" />
								</div>
								<h3 className="text-xl font-bold text-gray-900 mb-2">Account Already Exists</h3>
								<p className="text-gray-500 mb-6">
									It looks like there is already an account associated with <strong>{form.email}</strong>.
									Would you like to sign in instead?
								</p>

								<div className="flex gap-3">
									<button
										onClick={() => setShowUserExistsModal(false)}
										className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
									>
										Cancel
									</button>
									<Link
										to="/login"
										className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium transition-colors flex items-center justify-center"
									>
										Sign In
									</Link>
								</div>
							</div>
						</div>
					</div>
				)
			}
		</div>
	)
}
