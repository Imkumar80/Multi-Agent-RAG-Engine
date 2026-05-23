import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import AppLayout from './App.tsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Home from './pages/Home'
import Login from './pages/Login'
import Signup from './pages/Signup'
import SearchUsers from './pages/SearchUsers'
import Search from './pages/Search'
import Dashboard from './pages/Dashboard'
import VerifyEmail from './pages/VerifyEmail'
import ProtectedRoute from './components/ProtectedRoute'
import Settings from './pages/Settings'
import EditProfile from './pages/EditProfile'
import Profile from './pages/Profile'
import Messages from './pages/Messages'
import { RecoilRoot } from 'recoil'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<RecoilRoot>
			<AuthProvider>
				<BrowserRouter>
					<Routes>
						<Route path="/" element={<AppLayout />}>
							<Route index element={<Home />} />
							<Route path="login" element={<Login />} />
							<Route path="signup" element={<Signup />} />
							<Route element={<ProtectedRoute requireVerification={false} />}>
								<Route path="verify-email" element={<VerifyEmail />} />
							</Route>
							<Route element={<ProtectedRoute />}>
								<Route path="dashboard" element={<Dashboard />} />
								<Route path="search" element={<SearchUsers />} />						<Route path="search-papers" element={<Search />} />								<Route path="messages" element={<Messages />} />
								<Route path="settings" element={<Settings />} />
								<Route path="settings/edit-profile" element={<EditProfile />} />
								<Route path="profile/:username?" element={<Profile />} />
							</Route>
						</Route>
					</Routes>
				</BrowserRouter>
			</AuthProvider>
		</RecoilRoot>
	</StrictMode>,
)
