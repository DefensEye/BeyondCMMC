import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';


const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageLoaded, setPageLoaded] = useState(false);

  useEffect(() => {
    // Simulate page load effect
    const timer = setTimeout(() => setPageLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} setOpen={setSidebarOpen} />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header setSidebarOpen={setSidebarOpen} />
        

        
        <main 
          className={`flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 md:p-6 transition-opacity duration-500 ease-in-out ${pageLoaded ? 'opacity-100' : 'opacity-0'}`}
        >
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;