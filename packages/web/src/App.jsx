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
import ErrorBoundary from './components/ErrorBoundary';
import './App.css';

export const AppContext = createContext();

// Protected Route Component
const ProtectedRoute = ({ isAllowed, redirectPath = '/login', children }) => {
  if (!isAllowed) {
    return <Navigate to={redirectPath} replace />;
  }
  return children ? children : <Outlet />;
};

function App() {
  const { data: sessionData, isPending, error } = useSession();

  // Create a unified user object combining Auth user and DMS profile (branch from context if needed)
  const user = sessionData?.user;

  // State for the currently selected branch (useful if user has access to multiple, defaults to their home branch)
  const [currentBranch, setCurrentBranch] = useState('Astara Hotel');

  // State for the user's assigned branches from their profile
  const [userBranches, setUserBranches] = useState(['Astara Hotel']);
  
  // State for the user's department
  const [userDepartment, setUserDepartment] = useState('');

  // Global reference data state
  const [roles, setRoles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Pending approvals count for Notifications bell
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = async () => {
    if (!user) return;
    try {
      const data = await api.approvals.count({ branch: currentBranch });
      setPendingCount(data.count || 0);
    } catch (err) {
      console.error("Failed to refresh pending count:", err);
    }
  };

  // Fetch pending count whenever branch changes
  useEffect(() => {
    refreshPendingCount();
  }, [currentBranch, user]);

  // Fetch reference data when user authenticates
  useEffect(() => {
    if (user) {
      Promise.all([
        api.admin.roles.list().catch(err => []),
        api.admin.categories.list().catch(err => []),
        api.admin.departments.list().catch(err => []),
        api.profile.get().catch(err => ({ branches: ['Astara Hotel'] }))
      ]).then(([rolesData, catsData, deptsData, profileData]) => {
        setRoles(rolesData);
        setCategories(catsData);
        setDepartments(deptsData);
        
        const branches = profileData?.branches || ['Astara Hotel'];
        setUserBranches(branches);
        setUserDepartment(profileData?.department || '');
        
        // Auto-select their first branch if current isn't in their list
        if (branches.length > 0 && !branches.includes(currentBranch)) {
            setCurrentBranch(branches[0]);
        }
      });
    }
  }, [user]);

  if (isPending) {
    return <div className="loading-screen">Loading DMS...</div>;
  }

  const isAuthenticated = !!user;
  const isAdmin = user?.role === 'admin';

  return (
    <AppContext.Provider value={{ 
        user, 
        currentBranch, 
        setCurrentBranch, 
        userBranches, 
        userDepartment,
        roles, 
        categories,
        departments,
        pendingCount,
        refreshPendingCount 
    }}>
      <BrowserRouter>
        <ErrorBoundary>
          <Routes>
            {/* Public Route */}
            <Route
              path="/login"
              element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
            />

            {/* Protected Routes (Require Login) */}
            <Route element={<ProtectedRoute isAllowed={isAuthenticated} />}>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/documents/upload" element={<Upload />} />
                <Route path="/documents/:id" element={<DocumentDetail />} />
                <Route path="/approvals" element={<Approvals />} />
                <Route path="/settings" element={<Settings />} />

                {/* Admin Only Routes */}
                <Route element={<ProtectedRoute isAllowed={isAdmin} redirectPath="/dashboard" />}>
                  <Route path="/admin/users" element={<Users />} />
                  <Route path="/admin/signatures" element={<Signatures />} />
                  <Route path="/admin/workflows" element={<Workflows />} />
                  <Route path="/admin/keywords" element={<Keywords />} />
                  <Route path="/admin/delegation" element={<Delegation />} />
                  <Route path="/admin/roles" element={<Roles />} />
                  <Route path="/admin/categories" element={<Categories />} />
                  <Route path="/admin/departments" element={<Departments />} />
                </Route>
              </Route>
            </Route>

            {/* Root Route */}
            <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />} />
          </Routes>
        </ErrorBoundary>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

export default App;
