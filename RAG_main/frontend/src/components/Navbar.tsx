import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Settings, LogOut, ChevronDown, Search, FileText, Users, MessageSquare } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Navbar() {
  const { isAuthenticated, logout, firstName, lastName, avatarUrl, role, email } = useAuth();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<'select' | 'profile-input'>('select');
  const searchRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
        setSearchMode('select'); // Reset search mode on close
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSearchClick = () => {
    setIsSearchOpen(true);
  };

  const handleDocumentSearch = () => {
    setIsSearchOpen(false);
    navigate('/search-papers');
  };

  return (
    <nav className="w-full h-16 sticky top-0 z-50 bg-white shadow-sm">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6 relative">

        {/* Logo (left) */}
        <Link to="/dashboard" className="flex items-center gap-3 shrink-0">
          <img src={logo} alt="Resonav Logo" className="h-12 w-auto" />
        </Link>

        {/* Centered Search Bar (Trigger) */}
        {isAuthenticated && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md px-4" ref={searchRef}>
            <div
              onClick={handleSearchClick}
              className={`
                flex items-center gap-3 px-4 py-2 rounded-full border border-gray-200 
                bg-gray-50 hover:bg-white hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer
                ${isSearchOpen ? 'ring-2 ring-primary/20 border-primary' : ''}
              `}
            >
              <Search size={18} className="text-gray-400" />
              <span className="text-gray-500 text-sm select-none">Search...</span>
            </div>

            {/* Search Dropdown */}
            {isSearchOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50">
                {searchMode === 'select' ? (
                  <div className="p-2 grid grid-cols-2 gap-2">
                    {/* Profiles Card */}
                    <button
                      onClick={() => {
                        setIsSearchOpen(false);
                        navigate('/search');
                      }}
                      className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group"
                    >
                      <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Users size={20} />
                      </div>
                      <span className="font-medium text-gray-700">Search Profiles</span>
                      <span className="text-xs text-gray-400 mt-1">Find researchers & peers</span>
                    </button>

                    {/* Documents Card */}
                    <button
                      onClick={handleDocumentSearch}
                      className="flex flex-col items-center justify-center p-4 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group"
                    >
                      <div className="h-10 w-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <FileText size={20} />
                      </div>
                      <span className="font-medium text-gray-700">Search Documents</span>
                      <span className="text-xs text-gray-400 mt-1">Explore papers & articles</span>
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link
                to="/messages"
                className="p-2 text-gray-500 hover:text-primary hover:bg-gray-100 rounded-full transition-all"
                title="Messages"
              >
                <MessageSquare size={20} />
              </Link>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 focus:outline-none"
                >
                  <div className="h-10 w-10 rounded-full bg-gray-200 border border-gray-300 overflow-hidden flex items-center justify-center text-primary font-bold hover:ring-2 hover:ring-primary/20 transition-all">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                    ) : (
                      <span>{firstName?.[0]?.toUpperCase()}{lastName?.[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <ChevronDown size={16} className={`text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg py-1 ring-1 ring-black ring-opacity-5 animate-in fade-in zoom-in duration-100 border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50">
                      <p className="text-sm font-medium text-gray-900 truncate">{firstName} {lastName}</p>
                      <p className="text-xs text-gray-500 truncate">{email}</p>
                      <p className="text-xs text-gray-400 truncate capitalize">{role}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <User size={16} className="text-gray-400" />
                        My Profile
                      </Link>
                      <Link
                        to="/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <Settings size={16} className="text-gray-400" />
                        Settings
                      </Link>
                    </div>
                    <div className="py-1 border-t border-gray-50">
                      <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut size={16} />
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-primary transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="px-4 py-2 rounded-full text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-all shadow-sm hover:shadow"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
