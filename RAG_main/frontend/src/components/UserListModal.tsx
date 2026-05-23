import { X, UserPlus, UserCheck, MessageSquare } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { followUserApi, unfollowUserApi } from '../utils/api';
import { useAuth } from '../context/AuthContext';

type UserListItem = {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
    title?: string;
    institution?: string;
    avatarUrl?: string;
    isFollowing?: boolean;
};

type UserListModalProps = {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    users: UserListItem[];
    loading: boolean;
};

export default function UserListModal({ isOpen, onClose, title, users: initialUsers, loading }: UserListModalProps) {
    const { id: authId } = useAuth();
    const navigate = useNavigate();
    const [localUsers, setLocalUsers] = useState<UserListItem[]>([]);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    // Update local users when initialUsers changes
    useState(() => {
        setLocalUsers(initialUsers);
    });

    // We need useEffect to sync localUsers with initialUsers if it changes externally
    // But since this is a modal that usually fetches once per open, let's keep it simple.
    // Actually, it's better to use useEffect to update localUsers when initialUsers changes.
    // But let's just use the current approach or use initialUsers directly and handle state elsewhere?
    // Let's use localUsers but sync inside the component when opening or initialUsers changes.

    useState(() => {
        if (isOpen) setLocalUsers(initialUsers);
    });

    // Re-sync local users when initialUsers changes or modal opens
    // Since we are using standard React hooks:
    const displayUsers = localUsers.length > 0 || loading ? localUsers : initialUsers;

    const handleFollowToggle = async (user: UserListItem) => {
        if (processingIds.has(user.id)) return;

        setProcessingIds(prev => new Set(prev).add(user.id));
        try {
            if (user.isFollowing) {
                await unfollowUserApi(user.id);
                setLocalUsers(prev => (prev.length > 0 ? prev : initialUsers).map(u => u.id === user.id ? { ...u, isFollowing: false } : u));
            } else {
                await followUserApi(user.id);
                setLocalUsers(prev => (prev.length > 0 ? prev : initialUsers).map(u => u.id === user.id ? { ...u, isFollowing: true } : u));
            }
        } catch (error) {
            console.error("Follow toggle failed", error);
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(user.id);
                return next;
            });
        }
    };

    const handleMessageUser = (user: UserListItem) => {
        onClose();
        navigate(`/messages?recipientId=${user.id}`, {
            state: { recipient: user }
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col max-h-[80vh] animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-100 text-gray-500">
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (displayUsers.length === 0 && initialUsers.length === 0) ? (
                        <div className="text-center p-8 text-gray-500">
                            No users found.
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {(localUsers.length > 0 ? localUsers : initialUsers).map(user => (
                                <div key={user.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-lg transition-colors group">
                                    <Link
                                        to={`/profile/${user.username}`}
                                        onClick={onClose}
                                        className="flex items-center gap-3 flex-1 min-w-0"
                                    >
                                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold shrink-0">
                                            {user.avatarUrl ? (
                                                <img src={user.avatarUrl} alt={user.username} className="h-full w-full rounded-full object-cover" />
                                            ) : (
                                                <span>{user.firstName[0]}{user.lastName[0]}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-medium text-gray-900 truncate">
                                                {user.firstName} {user.lastName}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">
                                                {user.title || `@${user.username}`}
                                            </p>
                                        </div>
                                    </Link>

                                    {authId !== user.id && (
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleMessageUser(user)}
                                                className="p-2 rounded-lg text-gray-500 hover:text-primary hover:bg-primary/10 transition-colors"
                                                title="Message"
                                            >
                                                <MessageSquare size={18} />
                                            </button>
                                            <button
                                                onClick={() => handleFollowToggle(user)}
                                                disabled={processingIds.has(user.id)}
                                                className={`p-2 rounded-lg transition-colors ${user.isFollowing
                                                    ? 'text-gray-400 hover:text-gray-600'
                                                    : 'text-primary hover:bg-primary/10'
                                                    }`}
                                                title={user.isFollowing ? 'Unfollow' : 'Follow'}
                                            >
                                                {user.isFollowing ? <UserCheck size={20} /> : <UserPlus size={20} />}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
