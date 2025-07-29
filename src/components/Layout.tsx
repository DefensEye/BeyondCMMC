import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatBot from './ChatBot';

const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    // Simulate page load effect
    const timer = setTimeout(() => setPageLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleChatToggle = () => {
    setIsChatOpen(!isChatOpen);
  };

  const handleChatClose = () => {
    setIsChatOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header 
          setSidebarOpen={setSidebarOpen} 
          onChatToggle={handleChatToggle}
          isChatOpen={isChatOpen}
        />
        
        <main 
          className={`flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6 transition-opacity duration-500 ease-in-out ${
            pageLoaded ? 'opacity-100' : 'opacity-0'
          } ${
            isChatOpen ? 'mr-[25rem]' : ''
          }`}
        >
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* ChatBot */}
      <ChatBot isOpen={isChatOpen} onClose={handleChatClose} />
    </div>
  );
};

export default Layout;