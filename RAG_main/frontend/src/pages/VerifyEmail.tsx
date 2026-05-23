import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { resendVerificationApi } from '../utils/api'
import { Mail, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react'
import CompleteProfileModal from '../components/CompleteProfileModal'


export default function VerifyEmail() {
    const { email, verified, checkVerificationStatus } = useAuth()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(false)
    const [resendStatus, setResendStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null)
    const [showProfileModal, setShowProfileModal] = useState(false)

    useEffect(() => {
        if (verified) {
            setShowProfileModal(true)
        }

        // Poll for verification status every 3 seconds
        const interval = setInterval(() => {
            if (!verified) {
                checkVerificationStatus()
            }
        }, 3000)

        return () => clearInterval(interval)
    }, [verified, checkVerificationStatus])

    const handleResend = async () => {
        setLoading(true)
        setResendStatus(null)
        try {
            await resendVerificationApi()
            setResendStatus({ type: 'success', msg: 'Verification email sent successfully!' })
        } catch (error) {
            setResendStatus({ type: 'error', msg: 'Failed to send verification email. Please try again.' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-[80vh] flex items-center justify-center bg-gray-50 px-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-8 h-8 text-primary" />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">Verify your email</h1>
                <p className="text-gray-600 mb-8">
                    We've sent a verification link to <span className="font-semibold text-gray-900">{email}</span>.
                    Please check your inbox and click the link to verify your account.
                </p>

                {resendStatus && (
                    <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 text-sm ${resendStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                        {resendStatus.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                        {resendStatus.msg}
                    </div>
                )}



                <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4">
                        <RefreshCw className="animate-spin" size={16} />
                        <span>Waiting for verification...</span>
                    </div>

                    <button
                        onClick={handleResend}
                        disabled={loading}
                        className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                    >
                        Resend Verification Email
                    </button>

                    {(() => {
                        const getEmailProvider = (emailAddress: string | null | undefined) => {
                            if (!emailAddress) return null;
                            const lowerEmail = emailAddress.toLowerCase();
                            if (lowerEmail.includes('@gmail.com')) return { name: 'Gmail', url: 'https://mail.google.com/' };
                            if (lowerEmail.includes('@yahoo.com')) return { name: 'Yahoo Mail', url: 'https://mail.yahoo.com/' };
                            if (lowerEmail.includes('@outlook.com') || lowerEmail.includes('@hotmail.com')) return { name: 'Outlook', url: 'https://outlook.live.com/' };
                            return null;
                        };
                        const provider = getEmailProvider(email);

                        if (provider) {
                            return (
                                <a
                                    href={provider.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                                >
                                    Open {provider.name}
                                </a>
                            );
                        }
                        return null;
                    })()}
                </div>

                <p className="mt-8 text-sm text-gray-500">
                    Can't find the email? Check your spam folder or try resending.
                </p>
            </div>

            <CompleteProfileModal
                isOpen={showProfileModal}
                onClose={() => navigate('/dashboard')}
            />
        </div>
    )
}
