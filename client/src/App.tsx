import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
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
import Timesheets from './pages/Timesheets';
import ProfileEdit from './pages/ProfileEdit';
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

// Lazy load utility pages for better performance
const Goals = lazy(() => import('./pages/utilities/Goals'));
const Announcements = lazy(() => import('./pages/utilities/Announcements'));
const BulkPDFExport = lazy(() => import('./pages/utilities/BulkPDFExport'));
const CSVExport = lazy(() => import('./pages/utilities/CSVExport'));
const EInvoiceExport = lazy(() => import('./pages/utilities/EInvoiceExport'));
const DatabaseBackup = lazy(() => import('./pages/utilities/DatabaseBackup'));
const TicketPipeLog = lazy(() => import('./pages/utilities/TicketPipeLog'));
import Layout from './components/Layout';
import { SettingsProvider } from './components/SettingsProvider';
import ProtectedRoute from './components/ProtectedRoute';
import { ROUTE_PERMISSIONS } from './utils/permissions';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import PageTransition from './components/PageTransition';
import ErrorBoundary from './components/ErrorBoundary';

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
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <SettingsProvider />
          <Layout>
            <PageTransition>
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
            element={<Navigate to="/utilities/media" replace />} 
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
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/profile'] || ['admin', 'sales', 'sales_manager', 'coach', 'media', 'media_manager', 'designer', 'finance', 'user']} element={<Profile />} />} 
          />
          <Route 
            path="/profile/timesheets" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/profile'] || ['admin', 'sales', 'sales_manager', 'coach', 'media', 'media_manager', 'designer', 'finance', 'user']} element={<Timesheets />} />} 
          />
          <Route 
            path="/profile/edit" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/profile'] || ['admin', 'sales', 'sales_manager', 'coach', 'media', 'media_manager', 'designer', 'finance', 'user']} element={<ProfileEdit />} />} 
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
          {/* Utilities Routes */}
          <Route 
            path="/utilities/media" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/utilities/media'] || ['admin']} element={<Media />} />} 
          />
          <Route 
            path="/utilities/bulk-pdf-export" 
            element={
              <ProtectedRoute 
                allow={ROUTE_PERMISSIONS['/utilities/bulk-pdf-export'] || ['admin']} 
                element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-center">در حال بارگذاری...</div></div>}>
                    <BulkPDFExport />
                  </Suspense>
                } 
              />
            } 
          />
          <Route 
            path="/utilities/e-invoice-export" 
            element={
              <ProtectedRoute 
                allow={ROUTE_PERMISSIONS['/utilities/e-invoice-export'] || ['admin']} 
                element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-center">در حال بارگذاری...</div></div>}>
                    <EInvoiceExport />
                  </Suspense>
                } 
              />
            } 
          />
          <Route 
            path="/utilities/csv-export" 
            element={
              <ProtectedRoute 
                allow={ROUTE_PERMISSIONS['/utilities/csv-export'] || ['admin']} 
                element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-center">در حال بارگذاری...</div></div>}>
                    <CSVExport />
                  </Suspense>
                } 
              />
            } 
          />
          <Route 
            path="/utilities/calendar" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/utilities/calendar'] || ['admin']} element={<Calendar />} />} 
          />
          <Route 
            path="/utilities/announcements" 
            element={
              <ProtectedRoute 
                allow={ROUTE_PERMISSIONS['/utilities/announcements'] || ['admin']} 
                element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-center">در حال بارگذاری...</div></div>}>
                    <Announcements />
                  </Suspense>
                } 
              />
            } 
          />
          <Route 
            path="/utilities/goals" 
            element={
              <ProtectedRoute 
                allow={ROUTE_PERMISSIONS['/utilities/goals'] || ['admin']} 
                element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-center">در حال بارگذاری...</div></div>}>
                    <Goals />
                  </Suspense>
                } 
              />
            } 
          />
          <Route 
            path="/utilities/activity-log" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/utilities/activity-log'] || ['admin']} element={<ActivityLog />} />} 
          />
          <Route 
            path="/utilities/surveys" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/utilities/surveys'] || ['admin']} element={<Surveys />} />} 
          />
          <Route 
            path="/utilities/database-backup" 
            element={
              <ProtectedRoute 
                allow={ROUTE_PERMISSIONS['/utilities/database-backup'] || ['admin']} 
                element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-center">در حال بارگذاری...</div></div>}>
                    <DatabaseBackup />
                  </Suspense>
                } 
              />
            } 
          />
          <Route 
            path="/utilities/ticket-pipe-log" 
            element={
              <ProtectedRoute 
                allow={ROUTE_PERMISSIONS['/utilities/ticket-pipe-log'] || ['admin']} 
                element={
                  <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="text-center">در حال بارگذاری...</div></div>}>
                    <TicketPipeLog />
                  </Suspense>
                } 
              />
            } 
          />
          <Route 
            path="/settings" 
            element={<ProtectedRoute allow={ROUTE_PERMISSIONS['/settings'] || []} element={<Settings />} />} 
          />
              </Routes>
            </PageTransition>
          </Layout>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;


