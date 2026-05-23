import { useState, useEffect } from 'react'
import { searchUsersApi, followUserApi, unfollowUserApi, getRecommendationsApi, getPincodeRecommendationsApi } from '../utils/api'
import { Link, useSearchParams } from 'react-router-dom'
import { Search, UserPlus, UserCheck, Sparkles, MessageSquare, MapPin } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

type UserResult = {
    id: string
    username: string
    firstName: string
    lastName: string
    title?: string
    institution?: string
    isFollowing?: boolean
}

export default function SearchUsers() {
    const { id: authId } = useAuth()
    const [searchParams, setSearchParams] = useSearchParams()
    const initialQuery = searchParams.get('q') || ''

    const [query, setQuery] = useState(initialQuery)
    const [results, setResults] = useState<UserResult[]>([])
    const [recommendations, setRecommendations] = useState<UserResult[]>([])
    const [pincodeRecs, setPincodeRecs] = useState<UserResult[]>([])
    const [loading, setLoading] = useState(false)
    const [recLoading, setRecLoading] = useState(false)
    const [pincodeLoading, setPincodeLoading] = useState(false)
    const [searched, setSearched] = useState(false)

    // Load recommendations
    useEffect(() => {
        const loadRecs = async () => {
            setRecLoading(true)
            try {
                const res = await getRecommendationsApi()
                if (res.success) {
                    setRecommendations(res.users)
                }
            } catch (err) {
                console.error("Recs load failed", err)
            } finally {
                setRecLoading(false)
            }
        }

        const loadPincodeRecs = async () => {
            setPincodeLoading(true)
            try {
                const res = await getPincodeRecommendationsApi()
                if (res.success) {
                    setPincodeRecs(res.users)
                }
            } catch (err) {
                console.error("Pincode recs load failed", err)
            } finally {
                setPincodeLoading(false)
            }
        }

        loadRecs()
        loadPincodeRecs()
    }, [])

    // Perform search function
    const performSearch = async (searchQuery: string) => {
        if (!searchQuery.trim()) return

        setLoading(true)
        try {
            const res = await searchUsersApi(searchQuery)
            if (res.success) {
                setResults(res.users)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
            setSearched(true)
        }
    }

    // Effect to search on mount if query exists
    useEffect(() => {
        if (initialQuery) {
            performSearch(initialQuery)
        }
    }, [initialQuery])

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!query.trim()) return

        // Update URL
        setSearchParams({ q: query })
        performSearch(query)
    }

    const handleFollowToggle = async (user: UserResult, section?: 'rec' | 'pincode' | 'results') => {
        try {
            if (user.isFollowing) {
                await unfollowUserApi(user.id)
                const update = (prev: UserResult[]) => prev.map(u => u.id === user.id ? { ...u, isFollowing: false } : u)
                if (section === 'rec') setRecommendations(update)
                else if (section === 'pincode') setPincodeRecs(update)
                else setResults(update)
            } else {
                await followUserApi(user.id)
                const update = (prev: UserResult[]) => prev.map(u => u.id === user.id ? { ...u, isFollowing: true } : u)
                if (section === 'rec') setRecommendations(update)
                else if (section === 'pincode') setPincodeRecs(update)
                else setResults(update)
            }
        } catch (error) {
            console.error("Follow toggle failed", error)
        }
    }

    const UserCard = ({ user, section }: { user: UserResult, section: 'rec' | 'pincode' }) => (
        <div key={user.id} className="min-w-[200px] bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center text-primary font-bold text-xl mb-3">
                {user.firstName[0]}{user.lastName[0]}
            </div>
            <Link to={`/profile/${user.username}`} className="font-bold text-gray-900 hover:underline truncate w-full px-1">
                {user.firstName} {user.lastName}
            </Link>
            <p className="text-xs text-gray-500 mb-3 truncate w-full px-1">
                {user.title || `@${user.username}`}
            </p>
            <div className="flex flex-col gap-2 w-full">
                <button
                    onClick={() => handleFollowToggle(user, section)}
                    className={`w-full py-1.5 rounded-lg text-xs font-bold transition-colors ${user.isFollowing
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-primary text-white hover:bg-primary/90'
                        }`}
                >
                    {user.isFollowing ? 'Following' : 'Follow'}
                </button>
                <Link
                    to={`/messages?recipientId=${user.id}`}
                    state={{ recipient: user }}
                    className="w-full py-1.5 rounded-lg text-xs font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors"
                >
                    <MessageSquare size={14} />
                    Message
                </Link>
            </div>
        </div>
    )

    return (
        <div className="max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Find Papers and Researchers</h2>

            <form onSubmit={handleSearch} className="mb-8 relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name or username..."
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm transition-all"
                />
                <Search className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                <button
                    type="submit"
                    className="absolute right-2 top-2 px-6 py-1.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors shadow-sm"
                    disabled={loading}
                >
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {/* Recommendations Section */}
            {!searched && (
                <>
                    {(recommendations.length > 0 || recLoading) && (
                        <div className="mb-10">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="text-accent w-5 h-5" />
                                <h3 className="text-lg font-bold text-gray-800">Suggested for you</h3>
                            </div>
                            {recLoading ? (
                                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="min-w-[200px] h-[220px] bg-gray-50 rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 scroll-smooth">
                                    {recommendations.map(user => (
                                        <UserCard key={user.id} user={user} section="rec" />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {(pincodeRecs.length > 0 || pincodeLoading) && (
                        <div className="mb-10">
                            <div className="flex items-center gap-2 mb-4">
                                <MapPin className="text-primary w-5 h-5" />
                                <h3 className="text-lg font-bold text-gray-800">Researchers near you</h3>
                            </div>
                            {pincodeLoading ? (
                                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="min-w-[200px] h-[220px] bg-gray-50 rounded-xl animate-pulse" />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4 scroll-smooth">
                                    {pincodeRecs.map(user => (
                                        <UserCard key={user.id} user={user} section="pincode" />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}

            {/* Search Results */}
            <div className="space-y-4">
                {searched && (
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                            Search Results {results.length > 0 && `(${results.length})`}
                        </h3>
                        {results.length > 0 && (
                            <button onClick={() => { setSearched(false); setResults([]); setQuery('') }} className="text-xs text-primary hover:underline">
                                Clear
                            </button>
                        )}
                    </div>
                )}

                {searched && results.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-400">No users found matching "{query}"</p>
                    </div>
                )}

                {searched && results.map(user => (
                    <div key={user.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-lg transition-all group">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 font-bold text-xl group-hover:border-primary/20 group-hover:bg-primary/5 transition-colors">
                                {user.firstName[0]}{user.lastName[0]}
                            </div>
                            <div>
                                <Link to={`/profile/${user.username}`} className="font-bold text-lg text-gray-900 hover:text-primary transition-colors">
                                    {user.firstName} {user.lastName}
                                </Link>
                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                    <span>@{user.username}</span>
                                    {user.institution && <span className="text-gray-300">•</span>}
                                    <span>{user.institution}</span>
                                </p>
                                {user.title && (
                                    <p className="text-xs text-gray-400 mt-1">{user.title}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {authId !== user.id && (
                                <>
                                    <button
                                        onClick={() => handleFollowToggle(user, 'results')}
                                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${user.isFollowing
                                            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                            : 'bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20'
                                            }`}
                                    >
                                        {user.isFollowing ? (
                                            <>
                                                <UserCheck size={16} />
                                                Following
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus size={16} />
                                                Follow
                                            </>
                                        )}
                                    </button>
                                    <Link
                                        to={`/messages?recipientId=${user.id}`}
                                        state={{ recipient: user }}
                                        className="h-10 px-4 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all font-bold text-sm gap-2"
                                        title="Send Message"
                                    >
                                        <MessageSquare size={18} />
                                        Message
                                    </Link>
                                </>
                            )}
                            <Link
                                to={`/profile/${user.username}`}
                                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:text-primary hover:bg-primary/10 transition-all"
                                title="View Profile"
                            >
                                <Search size={20} />
                            </Link>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
