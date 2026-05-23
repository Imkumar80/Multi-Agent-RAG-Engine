import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

type Props = {
  requireVerification?: boolean
}

export default function ProtectedRoute({ requireVerification = true }: Props) {
  const { isAuthenticated, verified } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireVerification && !verified) {
    return <Navigate to="/verify-email" replace />
  }

  return <Outlet />
}
