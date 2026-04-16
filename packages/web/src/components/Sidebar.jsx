import { NavLink, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AppContext } from '../App';
import {
    LayoutDashboard,
    FileText,
    CheckCircle,
    Upload,
    Users,
    PenTool,
    GitBranch,
    Search,
    UserRoundCog,
    Settings,
    ChevronsLeft,
    ChevronsRight,
    Building2,
    ClipboardList,
} from 'lucide-react';
import './Sidebar.css';
import logoImg from '../assets/logo.png';

const mainNav = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Documents', icon: FileText, path: '/documents' },
    { label: 'Upload', icon: Upload, path: '/documents/upload' },
    { label: 'My Approvals', icon: CheckCircle, path: '/approvals' },
];

const adminNav = [
    { label: 'Users', icon: Users, path: '/admin/users' },
    { label: 'Roles', icon: UserRoundCog, path: '/admin/roles' },
    { label: 'Categories', icon: LayoutDashboard, path: '/admin/categories' },
    { label: 'Departments', icon: Building2, path: '/admin/departments' },
    { label: 'Signatures', icon: PenTool, path: '/admin/signatures' },
    { label: 'Workflows', icon: GitBranch, path: '/admin/workflows' },
    { label: 'Keywords', icon: Search, path: '/admin/keywords' },
    { label: 'Delegation', icon: UserRoundCog, path: '/admin/delegation' },
    { label: 'Audit Trail', icon: ClipboardList, path: '/admin/audit-trail' },
];

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
    const { user, currentBranch, setCurrentBranch, userBranches = ['Astara Hotel'] } = useContext(AppContext);
    const location = useLocation();

    const canSee = (item) => {
        if (!item.roles) return true;
        return item.roles.includes(user.role);
    };

    return (
        <>
            <div className={`sidebar-overlay ${mobileOpen ? 'visible' : ''}`} onClick={onMobileClose} />
            <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
                {/* Hotel Logo Area */}
                <div className="sidebar-logo" style={{ justifyContent: 'center', padding: collapsed ? '20px' : '20px 10px' }}>
                    {collapsed ? (
                        <div className="logo-image-container" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
                            <Building2 size={24} className="logo-placeholder-icon" />
                        </div>
                    ) : (
                        <img src={logoImg} alt="Astara & Pentacity Logo" style={{ width: '100%', maxHeight: '50px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.5))' }} />
                    )}
                </div>

                {/* Branch Selector */}
                <div className="branch-selector">
                    <select
                        className="branch-select"
                        value={currentBranch}
                        onChange={(e) => setCurrentBranch(e.target.value)}
                        disabled={userBranches.length <= 1}
                        title={userBranches.length <= 1 ? "Assigned to a single branch" : "Switch active branch"}
                    >
                        {userBranches.map(branch => (
                            <option key={branch} value={branch}>{branch}</option>
                        ))}
                    </select>
                </div>

                {/* Navigation */}
                <nav className="sidebar-nav">
                    <div className="nav-section">
                        <div className="nav-section-label">Main</div>
                        {mainNav.filter(canSee).map((item) => (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `nav-item ${isActive ? 'active' : ''}`
                                }
                                onClick={onMobileClose}
                            >
                                <span className="nav-item-icon">
                                    <item.icon size={20} />
                                </span>
                                <span className="nav-item-label">{item.label}</span>
                            </NavLink>
                        ))}
                    </div>

                    {user.role === 'admin' && (
                        <div className="nav-section">
                            <div className="nav-section-label">Administration</div>
                            {adminNav.map((item) => (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    className={({ isActive }) =>
                                        `nav-item ${isActive ? 'active' : ''}`
                                    }
                                    onClick={onMobileClose}
                                >
                                    <span className="nav-item-icon">
                                        <item.icon size={20} />
                                    </span>
                                    <span className="nav-item-label">{item.label}</span>
                                </NavLink>
                            ))}
                        </div>
                    )}

                    <div className="nav-section">
                        <div className="nav-section-label">Account</div>
                        <NavLink
                            to="/settings"
                            className={({ isActive }) =>
                                `nav-item ${isActive ? 'active' : ''}`
                            }
                            onClick={onMobileClose}
                        >
                            <span className="nav-item-icon">
                                <Settings size={20} />
                            </span>
                            <span className="nav-item-label">Settings</span>
                        </NavLink>
                    </div>
                </nav>

                {/* Collapse Toggle */}
                <div className="sidebar-collapse-btn">
                    <button className="collapse-toggle" onClick={onToggle} title={collapsed ? 'Expand' : 'Collapse'}>
                        {collapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
                    </button>
                </div>

                {/* Copyright */}
                {!collapsed && (
                    <div className="sidebar-copyright">
                        © {new Date().getFullYear()} muhamad nawawi. All rights reserved.
                    </div>
                )}
            </aside>
        </>
    );
}
