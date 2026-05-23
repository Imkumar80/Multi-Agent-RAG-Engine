import { Outlet } from 'react-router-dom'
import './App.css'

import Navbar from './components/Navbar'

export default function AppLayout() {
	return (
		<div className="min-h-screen">
			<Navbar />
			<main className="">
				<Outlet />
			</main>
		</div>
	)
}
