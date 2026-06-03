
import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import AIAssistantDrawer from './AIAssistantDrawer';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background-light">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onOpenAssistant={() => setIsAssistantOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
      <AIAssistantDrawer 
        isOpen={isAssistantOpen} 
        onClose={() => setIsAssistantOpen(false)} 
      />
    </div>
  );
};

export default MainLayout;
