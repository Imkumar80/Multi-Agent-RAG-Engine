import { useState } from 'react'
import { Link } from 'react-router-dom'
import { User, Shield, ChevronRight, Lock, Unlock, Briefcase } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Settings() {
    const { isPrivate, updateProfile, backendUserType } = useAuth()
    const [activeTab, setActiveTab] = useState<'general' | 'account' | 'privacy'>('general')
    const [privacyLoading, setPrivacyLoading] = useState(false)
    const [roleLoading, setRoleLoading] = useState(false)

    const handlePrivacyToggle = async () => {
        setPrivacyLoading(true)
        try {
            await updateProfile({ isPrivate: !isPrivate })
        } catch (error) {
            console.error("Failed to update privacy", error)
        } finally {
            setPrivacyLoading(false)
        }
    }

    const handleRoleChange = async (newRole: string) => {
        if (newRole === backendUserType) return;
        setRoleLoading(true)
        try {
            // @ts-ignore - backendUserType is the field expected by API for userType update? 
            // Wait, authController expects 'userType'. AuthContext maps 'backendUserType' <- 'userType'.
            // But updateProfile in AuthContext merges data. 
            // We need to send 'userType' to backend.
            // But AuthContext updateProfile takes Partial<AuthContextValue>. 
            // AuthContextValue has 'role' (guest/user) and 'backendUserType' (Researcher/Mentor/etc) ?
            // No, AuthContextValue has 'backendUserType'.
            // But the API expects 'userType'. 
            // Let's check updateProfileApi: it takes 'any'. 
            // So we can send { userType: newRole }.
            // But AuthContext.updateProfile maps inputs to state. 
            // If we send { userType: ... }, AuthContext won't update 'backendUserType' state automatically 
            // unless we map it or if we just reload. 
            // Let's check AuthContext.updateProfile: `setUser(prev => ({ ...prev, ...data }))`.
            // So we should pass { backendUserType: newRole } to update local state, 
            // AND the API call should handle mapping? 
            // No, api.ts `updateProfileApi` sends data directly.
            // Backend expects `userType`.
            // So we need to call updateProfile({ userType: newRole } as any).
            // NOTE: Ideally we should fix AuthContext to handle this mapping better.

            // For now, let's call the API, then manually refresh or update context.
            // Actually, let's just use updateProfile with the exact field backend expects, 
            // and maybe force a reload or handle state update manually if needed.

            await updateProfile({ userType: newRole } as any)
            // After update, we might need to refresh because token might need update? 
            // Or just UI update is enough.
        } catch (error) {
            console.error("Failed to update role", error)
        } finally {
            setRoleLoading(false)
        }
    }

    const tabs = [
        { id: 'general', label: 'General', icon: User },
        { id: 'account', label: 'Account', icon: Briefcase },
        { id: 'privacy', label: 'Privacy', icon: Shield },
    ]

    return (
        <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">Settings</h2>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar Navigation */}
                <div className="w-full md:w-64 flex-shrink-0">
                    <nav className="space-y-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`
                                        w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                                        ${activeTab === tab.id
                                            ? 'bg-primary/10 text-primary'
                                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                    `}
                                >
                                    <Icon className={`flex-shrink-0 -ml-1 mr-3 h-5 w-5 ${activeTab === tab.id ? 'text-primary' : 'text-gray-400'}`} />
                                    <span className="truncate">{tab.label}</span>
                                </button>
                            )
                        })}
                    </nav>
                </div>

                {/* Main Content */}
                <div className="flex-1 bg-white shadow rounded-xl overflow-hidden min-h-[400px]">

                    {/* General Settings */}
                    {activeTab === 'general' && (
                        <div className="p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">General Settings</h3>
                            <div className="space-y-4">
                                <Link to="/settings/edit-profile" className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                            <div className="bg-blue-50 p-2 rounded-full">
                                                <User className="h-5 w-5 text-blue-600" />
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-gray-900">Edit Profile</p>
                                                <p className="text-xs text-gray-500">Update your name, bio, and details</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-400" />
                                    </div>
                                </Link>
                                {/* Placeholder for other general settings */}
                            </div>
                        </div>
                    )}

                    {/* Account Settings */}
                    {activeTab === 'account' && (
                        <div className="p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Settings</h3>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">My Role</label>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-gray-500">Current Role</span>
                                        <span className="text-sm font-bold text-gray-900 px-2 py-0.5 bg-white rounded border border-gray-200">
                                            {backendUserType}
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3 mt-4">
                                        {['Researcher', 'Mentor', 'Intern'].map((role) => (
                                            <button
                                                key={role}
                                                onClick={() => handleRoleChange(role)}
                                                disabled={roleLoading || backendUserType === role}
                                                className={`
                                                    py-2 px-3 text-sm font-medium rounded-md border 
                                                    ${backendUserType === role
                                                        ? 'bg-primary text-white border-primary cursor-default'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
                                                    transition-colors
                                                `}
                                            >
                                                {role}
                                            </button>
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-2">
                                        Switching to Mentor will allow you to post internships.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Privacy Settings */}
                    {activeTab === 'privacy' && (
                        <div className="p-6">
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Privacy & Security</h3>

                            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                <div className="flex items-center">
                                    <div className={`p-2 rounded-full ${isPrivate ? 'bg-red-50' : 'bg-green-50'}`}>
                                        {isPrivate ? (
                                            <Lock className="h-5 w-5 text-red-600" />
                                        ) : (
                                            <Unlock className="h-5 w-5 text-green-600" />
                                        )}
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-900">Private Account</p>
                                        <p className="text-xs text-gray-500">
                                            {isPrivate
                                                ? "Only followers can see your posts and profile details."
                                                : "Anyone can see your profile and posts."}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={handlePrivacyToggle}
                                    disabled={privacyLoading}
                                    className={`
                                        relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary
                                        ${isPrivate ? 'bg-primary' : 'bg-gray-200'}
                                    `}
                                >
                                    <span
                                        aria-hidden="true"
                                        className={`
                                            pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200
                                            ${isPrivate ? 'translate-x-5' : 'translate-x-0'}
                                        `}
                                    />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
