import { useState, createContext, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useSession } from './lib/auth';
import { api } from './lib/api';
import Layout from './layouts/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import DocumentDetail from './pages/DocumentDetail';
import Upload from './pages/Upload';
import Approvals from './pages/Approvals';
import Users from './pages/Users';
import Signatures from './pages/Signatures';
import Workflows from './pages/Workflows';
import Keywords from './pages/Keywords';
import Delegation from './pages/Delegation';
import Roles from './pages/Roles';
import Categories from './pages/Categories';
import Departments from './pages/Departments';
import Settings from './pages/Settings';
import AuditTrail from './pages/AuditTrail';
import Templates from './pages/Templates';
import AIChat from './pages/AIChat';
import ErrorBoundary from './components/ErrorBoundary';
import Landing from './pages/Landing';
import GuideModal from './pages/GuideModal';
import { Lightbulb } from 'lucide-react';
import './App.css';
export const AppContext = createContext();
const ProtectedRoute = ({ isAllowed, redirectPath = '/login', children }) => {
  if (!isAllowed) {
    return <Navigate to={redirectPath} replace />;
  }
  return children ? children : <Outlet />;
};
function App() {
  const { data: sessionData, isPending, error } = useSession();
  const [cachedUser, setCachedUser] = useState(null);
  useEffect(() => {
    if (sessionData?.user) {
      setCachedUser(sessionData.user);
    } else if (!isPending && !error) {
      setCachedUser(null);
    } else if (error && error.status === 401) {
      setCachedUser(null);
    }
  }, [sessionData, isPending, error]);
  const user = sessionData?.user || cachedUser;
  const [currentBranch, setCurrentBranch] = useState('Astara Hotel');
  const [userBranches, setUserBranches] = useState(['Astara Hotel']);
  const [userDepartment, setUserDepartment] = useState('');
  const [roles, setRoles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const refreshPendingCount = async () => {
    if (!user) return;
    try {
      const data = await api.approvals.count({ branch: currentBranch });
      setPendingCount(data.count || 0);
    } catch (err) {
      console.error('Failed to refresh pending count:', err);
    }
  };
  useEffect(() => { refreshPendingCount(); }, [currentBranch, user]);
  useEffect(() => {
    if (user) {
      Promise.all([
        api.admin.roles.list().catch(() => []),
        api.admin.categories.list().catch(() => []),
        api.admin.departments.list().catch(() => []),
        api.profile.get().catch(() => ({ branches: ['Astara Hotel'] }))
      ]).then(([rolesData, catsData, deptsData, profileData]) => {
        setRoles(rolesData);
        setCategories(catsData);
        setDepartments(deptsData);
        const branches = profileData?.branches || ['Astara Hotel'];
        setUserBranches(branches);
        setUserDepartment(profileData?.department || '');
        if (branches.length > 0 && !branches.includes(currentBranch)) {
          setCurrentBranch(branches[0]);
        }
      });
    }
  }, [user]);
  const [showGuide, setShowGuide] = useState(false);
  
  // Auto-show guide on first login
  useEffect(() => {
    if (isAuthenticated && !localStorage.getItem('dms-onboarding-complete')) {
      setShowGuide(true);
    }
  }, [isAuthenticated]);

  if (isPending) {
    return <div className="loading-screen">Loading DMS...</div>;
  }
  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';
  return (
    <AppContext.Provider value={{ 
        user, currentBranch, setCurrentBranch, userBranches, userDepartment,
        roles, categories, departments, pendingCount, refreshPendingCount 
    }}>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
            <Route element={<ProtectedRoute isAllowed={isAuthenticated} />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/documents/upload" element={<Upload />} />
                <Route path="/documents/:id" element={<DocumentDetail />} />
                <Route path="/approvals" element={<Approvals />} />
                <Route path="/ai-chat" element={<AIChat />} />
                <Route path="/settings" element={<Settings />} />
                <Route element={<ProtectedRoute isAllowed={isAdmin} redirectPath="/dashboard" />}>
                  <Route path="/admin/users" element={<Users />} />
                  <Route path="/admin/signatures" element={<Signatures />} />
                  <Route path="/admin/workflows" element={<Workflows />} />
                  <Route path="/admin/keywords" element={<Keywords />} />
                  <Route path="/admin/delegation" element={<Delegation />} />
                  <Route path="/admin/roles" element={<Roles />} />
                  <Route path="/admin/categories" element={<Categories />} />
                  <Route path="/admin/departments" element={<Departments />} />
                  <Route path="/admin/templates" element={<Templates />} />
                  <Route path="/admin/audit-trail" element={<AuditTrail />} />
                </Route>
              </Route>
            </Route>
            <Route path="/" element={<Landing />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          {isAuthenticated && (
            <>
              <button 
                className="guide-fab" 
                onClick={() => setShowGuide(true)}
                title="Panduan Penggunaan"
              >
                <Lightbulb size={20} />
              </button>
              <GuideModal 
                isOpen={showGuide} 
                onClose={() => setShowGuide(false)} 
              />
            </>
          )}
        </ErrorBoundary>
      </BrowserRouter>
    </AppContext.Provider>
  );
}
export default App;
