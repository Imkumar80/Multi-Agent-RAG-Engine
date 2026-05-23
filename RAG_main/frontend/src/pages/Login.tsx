import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type Role = 'user'

export default function Login() {
	const { login } = useAuth()
	const navigate = useNavigate()
	const [form, setForm] = useState({
		email: '',
		password: '',
		role: 'user' as Role,
	})
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const onSubmit = async (e: FormEvent) => {
		e.preventDefault()
		setError(null)
		setLoading(true)
		try {
			await login(form)
			navigate(`/dashboard`, { replace: true })
		} catch (err: any) {
			setError(err?.response?.data?.message || 'Failed to login')
		} finally {
			setLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-squared-pattern">
			<div className="max-w-md w-full space-y-8 bg-white p-10 rounded-lg border border-gray-200 shadow-sm">
				<div>
					<h2 className="mt-6 text-center text-4xl font-extrabold text-gray-900">
						Sign in to your account
					</h2>
					<p className="mt-2 text-center text-md text-gray-600">
						Don't have an account?{' '}
						<Link to="/signup" className="font-medium text-primary hover:text-accent">
							Sign up
						</Link>
					</p>
				</div>
				<form className="mt-8 space-y-6" onSubmit={onSubmit}>
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
							autoComplete="current-password"
							required
							className="appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-accent focus:border-accent focus:z-10 sm:text-lg"
							placeholder="Password"
							value={form.password}
							onChange={(e) => setForm({ ...form, password: e.target.value })}
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

					<div>
						<button
							type="submit"
							disabled={loading}
							className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-medium rounded-md text-white bg-primary hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent"
						>
							{loading ? 'Signing in...' : 'Sign In'}
						</button>
					</div>
					<div className="text-center">
						<a href="#" className="font-medium text-primary hover:text-accent">
							Forgot your password?
						</a>
					</div>
				</form>
			</div>
		</div>
	)
}
