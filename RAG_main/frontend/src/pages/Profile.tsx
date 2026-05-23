import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { MapPin, Building, Mail, Edit, UserPlus, UserCheck, Users, MessageSquare } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getPublicProfileApi, followUserApi, unfollowUserApi, getFollowersApi, getFollowingApi } from '../utils/api'
import UserListModal from '../components/UserListModal'

export default function Profile() {
    const {
        username: authUsername,
        firstName: authFirstName,
        lastName: authLastName,
        title: authTitle,
        institution: authInstitution,
        interests: authInterests,
        bio: authBio,
        city: authCity,
        pincode: authPincode,
        avatarUrl: authAvatarUrl,
        isAuthenticated
    } = useAuth()

    const navigate = useNavigate()
    const { username: paramUsername } = useParams()
    const [loading, setLoading] = useState(false)
    const [publicUser, setPublicUser] = useState<any>(null)
    const [isFollowing, setIsFollowing] = useState(false)
    const [stats, setStats] = useState({ followers: 0, following: 0 })
    const [error, setError] = useState('')

    // Modal state
    const [modalOpen, setModalOpen] = useState(false)
    const [modalTitle, setModalTitle] = useState('')
    const [modalUsers, setModalUsers] = useState<any[]>([])
    const [modalLoading, setModalLoading] = useState(false)

    const isOwnProfile = !paramUsername || (isAuthenticated && paramUsername === authUsername)
    // Use the explicit username for fetching lists, falling back to authUsername if it's own profile
    const targetUsername = paramUsername || authUsername

    useEffect(() => {
        if (targetUsername) {
            setLoading(true)
            getPublicProfileApi(targetUsername)
                .then(res => {
                    if (res.success) {
                        setPublicUser(res.user)
                        setIsFollowing(res.isFollowing)
                        setStats(res.stats)
                    } else {
                        setError('User not found')
                    }
                })
                .catch(err => {
                    console.error(err)
                    setError('Failed to load profile')
                })
                .finally(() => setLoading(false))
        }
    }, [targetUsername])

    const handleFollow = async () => {
        if (!publicUser) return
        try {
            if (isFollowing) {
                await unfollowUserApi(publicUser.id)
                setIsFollowing(false)
                setStats(prev => ({ ...prev, followers: prev.followers - 1 }))
            } else {
                await followUserApi(publicUser.id)
                setIsFollowing(true)
                setStats(prev => ({ ...prev, followers: prev.followers + 1 }))
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleMessage = () => {
        if (!publicUser) return
        navigate(`/messages?recipientId=${publicUser.id}`, {
            state: { recipient: publicUser }
        })
    }

    const openFollowersModal = async () => {
        if (!targetUsername) return
        setModalTitle('Followers')
        setModalOpen(true)
        setModalLoading(true)
        try {
            const res = await getFollowersApi(targetUsername)
            if (res.success) {
                setModalUsers(res.users)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setModalLoading(false)
        }
    }

    const openFollowingModal = async () => {
        if (!targetUsername) return
        setModalTitle('Following')
        setModalOpen(true)
        setModalLoading(true)
        try {
            const res = await getFollowingApi(targetUsername)
            if (res.success) {
                setModalUsers(res.users)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setModalLoading(false)
        }
    }

    if (loading) return <div className="text-center py-20">Loading profile...</div>
    if (error) return <div className="text-center py-20 text-red-500">{error}</div>

    // Determine data source
    const displayUser = isOwnProfile ? {
        firstName: authFirstName,
        lastName: authLastName,
        title: authTitle,
        institution: authInstitution,
        interests: authInterests,
        bio: authBio,
        city: authCity,
        pincode: authPincode,
        avatarUrl: authAvatarUrl,
        username: authUsername
    } : publicUser

    if (!displayUser) return null; // Should not happen 

    const fullName = `${displayUser.firstName || ''} ${displayUser.lastName || ''}`.trim() || 'User'
    const displayTitle = displayUser.title || 'Researcher'
    const displayInstitution = displayUser.institution || 'Resonav'

    // Parse interests if needed
    const interestList = Array.isArray(displayUser.interests)
        ? displayUser.interests
        : (displayUser.interests || '').split(',').filter(Boolean)

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            {/* Profile Header Card */}
            <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
                {/* Cover Image */}
                <div className="h-32 sm:h-48 bg-gradient-to-r from-primary to-accent"></div>

                <div className="relative px-6 pb-6">
                    <div className="flex flex-col sm:flex-row items-start">
                        {/* Avatar */}
                        <div className="-mt-16 sm:-mt-20 mb-4 sm:mb-0 relative">
                            <div className="h-32 w-32 sm:h-40 sm:w-40 rounded-full border-4 border-white bg-white overflow-hidden shadow-md">
                                {displayUser.avatarUrl ? (
                                    <img src={displayUser.avatarUrl} alt={fullName} className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full bg-gray-200 flex items-center justify-center text-4xl font-bold text-gray-400">
                                        {displayUser.firstName?.[0]}{displayUser.lastName?.[0]}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="flex-1 sm:ml-6 sm:mt-4 w-full">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">{fullName}</h1>
                                    <p className="text-lg text-gray-600 font-medium mt-1">{displayTitle}</p>
                                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                        <Building size={14} />
                                        {displayInstitution}
                                    </p>
                                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                                        {(displayUser.city || displayUser.pincode) && (
                                            <span className="flex items-center gap-1">
                                                <MapPin size={14} />
                                                {[displayUser.city, displayUser.pincode].filter(Boolean).join(', ')}
                                            </span>
                                        )}
                                        {/* Contact info only visible if follow logic allowed or public? keeping it generic */}
                                        <span className="flex items-center gap-1 text-primary hover:underline cursor-pointer">
                                            <Mail size={14} />
                                            Contact info
                                        </span>
                                    </div>

                                    {/* Stats - Now Clickable */}
                                    <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                                        <button
                                            onClick={openFollowersModal}
                                            className="flex items-center gap-1 font-medium hover:text-primary transition-colors"
                                        >
                                            <Users size={16} />
                                            <span className="font-bold">{stats.followers}</span> Followers
                                        </button>
                                        <button
                                            onClick={openFollowingModal}
                                            className="font-medium hover:text-primary transition-colors"
                                        >
                                            <span className="font-bold">{stats.following}</span> Following
                                        </button>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                {isOwnProfile ? (
                                    <Link
                                        to="/settings/edit-profile"
                                        className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                                        title="Edit Profile"
                                    >
                                        <Edit size={20} />
                                    </Link>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleMessage}
                                            className="flex items-center gap-2 px-4 py-2 rounded-full font-medium text-primary border border-primary/30 hover:bg-primary/10 transition-colors"
                                        >
                                            <MessageSquare size={18} />
                                            Message
                                        </button>
                                        <button
                                            onClick={handleFollow}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-colors ${isFollowing
                                                ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                                : 'bg-primary text-white hover:bg-primary/90'
                                                }`}
                                        >
                                            {isFollowing ? (
                                                <>
                                                    <UserCheck size={18} />
                                                    Following
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus size={18} />
                                                    Follow
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Column (Main Content) */}
                <div className="md:col-span-2 space-y-6">
                    {/* About Section */}
                    <div className="bg-white rounded-xl shadow p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">About</h2>
                        {displayUser.bio ? (
                            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                {displayUser.bio}
                            </p>
                        ) : (
                            <p className="text-gray-400 italic">
                                {isOwnProfile ? (
                                    <>No bio added yet. <Link to="/settings/edit-profile" className="text-primary hover:underline">Add a bio</Link></>
                                ) : (
                                    'No bio available.'
                                )}
                            </p>
                        )}
                    </div>

                    {/* Activity Placeholder */}
                    <div className="bg-white rounded-xl shadow p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Activity</h2>
                        <p className="text-gray-500">User hasn't posted anything yet.</p>
                    </div>
                </div>

                {/* Right Column (Sidebar) */}
                <div className="space-y-6">
                    {/* Interests */}
                    <div className="bg-white rounded-xl shadow p-6">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Areas of Interest</h2>
                        {interestList && interestList.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {interestList.map((interest: string, idx: number) => (
                                    <span
                                        key={idx}
                                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
                                    >
                                        {interest.trim()}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <p className="text-gray-400 italic text-sm">No interests listed.</p>
                        )}
                    </div>

                    {/* Public Profile Link - Only for own profile */}
                    {isOwnProfile && (
                        <div className="bg-white rounded-xl shadow p-6">
                            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Public Profile</h2>
                            <p className="text-sm text-gray-900 break-all">
                                www.resonav.com/profile/{displayUser.username || 'user'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* User List Modal */}
            <UserListModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title={modalTitle}
                users={modalUsers}
                loading={modalLoading}
            />
        </div>
    )
}
