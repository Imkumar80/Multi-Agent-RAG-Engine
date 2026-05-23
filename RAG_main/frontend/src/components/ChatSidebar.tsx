import { Plus, MessageSquare, Trash2 } from 'lucide-react'

type ChatSidebarProps = {
    onNewChat: () => void
    history: { id: string; title: string; date: string }[]
    activeChatId?: string
    onSelectChat: (id: string) => void
    onDeleteChat?: (id: string) => void
}

export default function ChatSidebar({
    onNewChat,
    history,
    activeChatId,
    onSelectChat,
    onDeleteChat
}: ChatSidebarProps) {
    return (
        <div className="w-64 bg-gray-100 text-gray-900 flex flex-col h-[calc(100vh-4rem)] border-r border-gray-200">
            {/* New Chat Button */}
            <div className="p-4">
                <button
                    onClick={onNewChat}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 rounded-lg border border-gray-200 shadow-sm transition-colors text-sm font-medium text-gray-700"
                >
                    <Plus size={16} className="text-primary" />
                    New chat
                </button>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4 custom-scrollbar">
                {/* Categorize by date roughly if needed, for now just a list */}
                <div className="px-2">
                    <p className="text-xs font-medium text-gray-500 mb-2 px-2">Recent</p>
                    <div className="space-y-1">
                        {history.map((chat) => (
                            <div
                                key={chat.id}
                                className={`
                                    group flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer text-sm
                                    ${activeChatId === chat.id ? 'bg-white border border-gray-200 shadow-sm text-primary font-medium' : 'text-gray-700 hover:bg-gray-200/50'}
                                    transition-all
                                `}
                                onClick={() => onSelectChat(chat.id)}
                            >
                                <MessageSquare size={16} className={`${activeChatId === chat.id ? 'text-primary' : 'text-gray-400'} shrink-0`} />
                                <span className="truncate flex-1">{chat.title}</span>
                                {activeChatId === chat.id && onDeleteChat && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            onDeleteChat(chat.id)
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 text-gray-400 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom Section (optional user profile or simplified settings if not in navbar) */}
            {/* Since we have a navbar, we might not strictly need this, but it adds to the aesthetic */}
            <div className="p-4 border-t border-gray-200">
                <div className="text-xs text-center text-gray-400">
                    Resonav Research AI
                </div>
            </div>
        </div>
    )
}
