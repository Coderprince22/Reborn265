/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider } from './components/AuthGuard';
import { Shell } from './components/Shell';
import { Chatbot } from './components/Chatbot';
import { DashboardView, HRView, ProjectsView, MembersView, FinanceView, EventsView, ImpactView, AdminView, CommView, ProfileView, ReportsView, MeetingsView, FinancialReportsView } from './components/Views';

export default function App() {
  const [activeTab, setTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView onNavigate={setTab} />;
      case 'hr': return <HRView onNavigate={setTab} />;
      case 'projects': return <ProjectsView />;
      case 'members': return <MembersView />;
      case 'finance': return <FinanceView onNavigate={setTab} />;
      case 'finance_reports': return <FinancialReportsView />;
      case 'events': return <EventsView />;
      case 'comm': return <CommView />;
      case 'meetings': return <MeetingsView />;
      case 'impact': return <ImpactView />;
      case 'reports': return <ReportsView onNavigate={setTab} />;
      case 'admin': return <AdminView onNavigate={setTab} />;
      case 'profile': return <ProfileView />;
      default: return <DashboardView onNavigate={setTab} />;
    }
  };

  return (
    <AuthProvider>
      <Shell activeTab={activeTab} onTabChange={setTab}>
        {renderContent()}
      </Shell>
      <Chatbot />
    </AuthProvider>
  );
}
