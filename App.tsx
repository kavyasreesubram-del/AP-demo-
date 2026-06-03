
import DataSources from './screens/DataSources';
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './screens/Login';
import WorkflowOverview from './screens/WorkflowOverview';
import Dashboard from './screens/Dashboard';
import ValidationDetail from './screens/ValidationDetail';
import Success from './screens/Success';
import APAssociateEvents from './screens/APAssociateEvents';
import APManagerDashboard from './screens/APManagerDashboard';
import APManagerSubmit from './screens/APManagerSubmit';
import Insights from './screens/Insights';
import Diagnostics from './screens/Diagnostics';
import SoxEvidence from './screens/SoxEvidence';
import MainLayout from './components/MainLayout';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        {/* The root path is now the Login/Landing page */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* Insights route */}
        <Route path="/insights" element={<MainLayout><Insights /></MainLayout>} />

        {/* AP Diagnostics route */}
        <Route path="/diagnostics" element={<MainLayout><Diagnostics /></MainLayout>} />

        {/* SOX Evidence route — visible to AP Manager + Insights personas */}
        <Route path="/sox-evidence" element={<MainLayout><SoxEvidence /></MainLayout>} />

        {/* AP Associate routes wrapped in MainLayout */}
        <Route path="/associate/overview" element={<MainLayout><WorkflowOverview /></MainLayout>} />
        <Route path="/invoices" element={<MainLayout><Dashboard /></MainLayout>} />
        <Route path="/validation/:id" element={<MainLayout><ValidationDetail /></MainLayout>} />
        <Route path="/success/:id" element={<MainLayout><Success /></MainLayout>} />
        <Route path="/events" element={<MainLayout><APAssociateEvents /></MainLayout>} />

        {/* AP Manager specific routes */}
        <Route path="/manager/dashboard" element={<MainLayout><APManagerDashboard /></MainLayout>} />
        <Route path="/manager/submit" element={<MainLayout><APManagerSubmit /></MainLayout>} />
        <Route path="/data-sources" element={<MainLayout><DataSources /></MainLayout>} />

        {/* Fallback to root (Login) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
};

export default App;
