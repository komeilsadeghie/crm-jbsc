import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerDetail from './pages/CustomerDetail';
import Coaching from './pages/Coaching';
import Reports from './pages/Reports';
import Leads from './pages/Leads';
import Deals from './pages/Deals';
import Media from './pages/Media';
import Calendar from './pages/Calendar';
import Profile from './pages/Profile';
import ImportExport from './pages/ImportExport';
import Estimates from './pages/Estimates';
import Tasks from './pages/Tasks';
import Contracts from './pages/Contracts';
import Tickets from './pages/Tickets';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import Expenses from './pages/Expenses';
import KnowledgeBase from './pages/KnowledgeBase';
import EmailTemplates from './pages/EmailTemplates';
import Settings from './pages/Settings';
import Proposals from './pages/Proposals';
import PaymentGateways from './pages/PaymentGateways';
import Surveys from './pages/Surveys';
import ActivityLog from './pages/ActivityLog';
import Layout from './components/Layout';
import { SettingsProvider } from './components/SettingsProvider';
import ProtectedRoute from './components/ProtectedRoute';
import { ROUTE_PERMISSIONS } from './utils/permissions';

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral-50">
        <div className="text-xl text-neutral-800">در حال بارگذاری...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <>
      <SettingsProvider />
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route 
            path="/dashboard" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/dashboard'] || []} element={<Dashboard />} />} 
          />
          <Route 
            path="/leads" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/leads'] || []} element={<Leads />} />} 
          />
          <Route 
            path="/deals" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/deals'] || []} element={<Deals />} />} 
          />
          <Route 
            path="/customers" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/customers'] || []} element={<Customers />} />} 
          />
          <Route 
            path="/customers/:id" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/customers'] || []} element={<CustomerDetail />} />} 
          />
          <Route 
            path="/media" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/media'] || []} element={<Media />} />} 
          />
          <Route 
            path="/coaching" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/coaching'] || []} element={<Coaching />} />} 
          />
          <Route 
            path="/reports" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/reports'] || []} element={<Reports />} />} 
          />
          <Route 
            path="/calendar" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/calendar'] || []} element={<Calendar />} />} 
          />
          <Route 
            path="/profile" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/profile'] || []} element={<Profile />} />} 
          />
          <Route 
            path="/import-export" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/import-export'] || []} element={<ImportExport />} />} 
          />
          <Route 
            path="/estimates" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/estimates'] || []} element={<Estimates />} />} 
          />
          <Route 
            path="/tasks" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/tasks'] || []} element={<Tasks />} />} 
          />
          <Route 
            path="/contracts" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/contracts'] || []} element={<Contracts />} />} 
          />
          <Route 
            path="/tickets" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/tickets'] || []} element={<Tickets />} />} 
          />
          <Route 
            path="/projects" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/projects'] || []} element={<Projects />} />} 
          />
          <Route 
            path="/projects/:id" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/projects'] || []} element={<ProjectDetail />} />} 
          />
          <Route 
            path="/expenses" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/expenses'] || []} element={<Expenses />} />} 
          />
          <Route 
            path="/knowledge-base" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/knowledge-base'] || []} element={<KnowledgeBase />} />} 
          />
          <Route 
            path="/email-templates" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/email-templates'] || []} element={<EmailTemplates />} />} 
          />
          <Route 
            path="/proposals" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/proposals'] || []} element={<Proposals />} />} 
          />
          <Route 
            path="/payment-gateways" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/payment-gateways'] || []} element={<PaymentGateways />} />} 
          />
          <Route 
            path="/surveys" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/surveys'] || []} element={<Surveys />} />} 
          />
          <Route 
            path="/activity-log" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/activity-log'] || []} element={<ActivityLog />} />} 
          />
          <Route 
            path="/settings" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/settings'] || []} element={<Settings />} />} 
          />
        </Routes>
      </Layout>
    </>
  );
}

export default App;


