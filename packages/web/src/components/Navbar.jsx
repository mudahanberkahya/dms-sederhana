import { useContext, useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppContext } from '../App';
import { Search, Bell, Menu, ChevronRight, LogOut, User } from 'lucide-react';
import { authClient } from '../lib/auth';
import './Navbar.css';

const routeNames = {
    '/dashboard': 'Dashboard',
    '/documents': 'Documents',
    '/documents/upload': 'Upload Document',
    '/approvals': 'My Approvals',
    '/admin/users': 'User Management',
    '/admin/signatures': 'Signature Management',
    '/admin/workflows': 'Workflow Configuration',
    '/admin/keywords': 'Keyword Configuration',
    '/admin/delegation': 'Delegation Management',
    '/settings': 'Settings',
};

export default function Navbar({ sidebarWidth, onMobileMenuOpen }) {
    const { user, pendingCount } = useContext(AppContext);
    const location = useLocation();
    const navigate = useNavigate();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);

    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    const dropdownRef = useRef(null);
    const notificationsRef = useRef(null);
    const searchRef = useRef(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setNotificationsOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef, notificationsRef, searchRef]);

    // Handle debounced search API call
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length >= 2) {
                setIsSearching(true);
                try {
                    const { api } = await import('../lib/api.js');
                    const results = await api.search(searchQuery.trim());
                    setSearchResults(results);
                    setSearchOpen(true);
                } catch (e) {
                    console.error("Search error", e);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setSearchResults(null);
                setSearchOpen(false);
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const handleSignOut = async () => {
        await authClient.signOut();
        navigate('/login');
    };

    const getPageName = () => {
        if (location.pathname.match(/^\/documents\/[^/]+$/) && location.pathname !== '/documents/upload') {
            return 'Document Detail';
        }
        return routeNames[location.pathname] || 'Page';
    };

    const getSection = () => {
        if (location.pathname.startsWith('/admin')) return 'Administration';
        if (location.pathname.startsWith('/documents')) return 'Documents';
        return null;
    };

    const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

    return (
        <header className="navbar" style={{ left: sidebarWidth }}>
            <div className="navbar-left">
                <button className="navbar-hamburger" onClick={onMobileMenuOpen}>
                    <Menu size={20} />
                </button>

                <div className="navbar-breadcrumb">
                    {getSection() && (
                        <>
                            <span>{getSection()}</span>
                            <ChevronRight size={14} />
                        </>
                    )}
                    <span className="current">{getPageName()}</span>
                </div>
            </div>

            <div className="navbar-search" ref={searchRef}>
                <Search size={16} className="navbar-search-icon" />
                <input
                    type="text"
                    className="navbar-search-input"
                    placeholder="Search documents, users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => { if (searchResults) setSearchOpen(true); }}
                />
                
                {searchOpen && (
                    <div className="search-dropdown">
                        {isSearching ? (
                            <div className="search-state-msg">Searching...</div>
                        ) : searchResults ? (
                            <>
                                {searchResults.documents.length === 0 && searchResults.users.length === 0 && (
                                    <div className="search-state-msg">No results found</div>
                                )}
                                
                                {searchResults.documents.length > 0 && (
                                    <div className="search-category">
                                        <div className="search-category-title">Documents</div>
                                        {searchResults.documents.map(doc => (
                                            <div 
                                                key={`doc-${doc.id}`} 
                                                className="search-item"
                                                onClick={() => {
                                                    setSearchOpen(false);
                                                    setSearchQuery('');
                                                    navigate(`/documents/${doc.id}`);
                                                }}
                                            >
                                                <div className="search-item-title">{doc.displayId} - {doc.title}</div>
                                                <div className="search-item-sub">Status: {doc.status} | Category: {doc.category}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {searchResults.users.length > 0 && (
                                    <div className="search-category" style={searchResults.documents.length > 0 ? { borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '8px' } : {}}>
                                        <div className="search-category-title">Users</div>
                                        {searchResults.users.map(u => (
                                            <div 
                                                key={`user-${u.id}`} 
                                                className="search-item"
                                                onClick={() => {
                                                    setSearchOpen(false);
                                                    setSearchQuery('');
                                                    navigate(`/admin/users`);
                                                }}
                                            >
                                                <div className="search-item-title">{u.name}</div>
                                                <div className="search-item-sub" style={{ textTransform: 'capitalize' }}>{u.role?.replace('_', ' ')} - {u.email}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : null}
                    </div>
                )}
            </div>

            <div className="navbar-right">
                <div className="notification-wrapper" ref={notificationsRef} style={{ position: 'relative' }}>
                    <button 
                        className="notification-btn"
                        onClick={() => {
                            setNotificationsOpen(!notificationsOpen);
                            // Navigate directly to approvals page since we can't 'clear' real pending counts
                            if (!notificationsOpen) navigate('/approvals');
                        }}
                    >
                        <Bell size={20} />
                        {pendingCount > 0 && <span className="notification-badge">{pendingCount}</span>}
                    </button>
                    
                    {notificationsOpen && (
                        <div className="user-dropdown notification-dropdown" style={{ width: '320px' }}>
                            <div className="dropdown-header">
                                <p className="dropdown-name" style={{ marginBottom: 0 }}>Notifications</p>
                            </div>
                            <div className="dropdown-divider"></div>
                            <div className="dropdown-item" style={{ flexDirection: 'column', alignItems: 'flex-start', cursor: 'default' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Purchase Order Approved</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>PO-2026-0042 was approved by Cost Control.</span>
                            </div>
                            <div className="dropdown-item" style={{ flexDirection: 'column', alignItems: 'flex-start', cursor: 'default' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Pending Action Required</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>You have a new CA document awaiting your approval.</span>
                            </div>
                            <div className="dropdown-item" style={{ flexDirection: 'column', alignItems: 'flex-start', cursor: 'default' }}>
                                <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>System Update</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DMS scheduled maintenance tonight at 00:00.</span>
                            </div>
                            <div className="dropdown-divider"></div>
                            <button 
                                className="dropdown-item" 
                                style={{ justifyContent: 'center', color: 'var(--accent-teal)' }}
                                onClick={() => {
                                    setNotificationsOpen(false);
                                    // Navigate to a notifications page (or alert if not implemented yet)
                                    navigate('/notifications');
                                }}
                            >
                                View All Notifications
                            </button>
                        </div>
                    )}
                </div>

                <div className="user-menu" ref={dropdownRef}>
                    <div
                        className="user-menu-trigger"
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                    >
                        <div className="user-avatar">{initials}</div>
                        <div className="user-info">
                            <span className="user-name">{user.name}</span>
                            <span className="user-role" style={{ textTransform: 'capitalize' }}>{user.role?.replace('_', ' ')}</span>
                        </div>
                    </div>

                    {dropdownOpen && (
                        <div className="user-dropdown">
                            <div className="dropdown-header">
                                <p className="dropdown-name">{user.name}</p>
                                <p className="dropdown-email">{user.email}</p>
                            </div>
                            <div className="dropdown-divider"></div>
                            <button className="dropdown-item" onClick={() => navigate('/settings')}>
                                <User size={16} />
                                Profile Settings
                            </button>
                            <button className="dropdown-item text-danger" onClick={handleSignOut}>
                                <LogOut size={16} />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
