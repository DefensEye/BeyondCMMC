import React, { useState, useEffect } from 'react';
import { Menu, Bell, X, Shield, RefreshCw, ChevronDown, Settings, User, LogOut, Search } from 'lucide-react';
import { useSupabase } from '../contexts/SupabaseContext';

interface HeaderProps {
  setSidebarOpen: (open: boolean) => void;
}

const Header: React.FC<HeaderProps> = ({ setSidebarOpen }) => {
  const { complianceScore, refreshData, loading } = useSupabase();
  const [showNotification, setShowNotification] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [animateScore, setAnimateScore] = useState(false);
  
  // Trigger animation after component mounts
  useEffect(() => {
    const timer = setTimeout(() => setAnimateScore(true), 500);
    return () => clearTimeout(timer);
  }, []);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshData();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <header className="bg-white border-b border-gray-200 z-30 sticky top-0 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              type="button"
              className="p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 lg:hidden focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="flex items-center">
              <Shield className="h-7 w-7 text-primary-600 mr-2 hidden sm:block" />
              <span className="text-xl font-semibold text-gray-800 hidden lg:block">DefenseEye Dashboard</span>
              <span className="text-xl font-semibold text-gray-800 lg:hidden">DefenseEye</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center mx-auto max-w-xs w-full">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search dashboard..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            {complianceScore && (
              <div className="hidden lg:flex items-center bg-gray-50 px-3 py-1.5 rounded-full">
                <div className="flex items-center">
                  <span className="text-xs font-medium text-gray-500 mr-2">Compliance:</span>
                  <div className="h-6 w-20 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${
                        complianceScore.overall_score >= 80
                          ? 'bg-success-500'
                          : complianceScore.overall_score >= 60
                          ? 'bg-warning-500'
                          : 'bg-danger-500'
                      }`}
                      style={{ width: `${animateScore ? complianceScore.overall_score : 0}%` }}
                    ></div>
                  </div>
                  <span className={`ml-2 text-sm font-bold ${
                    complianceScore.overall_score >= 80
                      ? 'text-success-600'
                      : complianceScore.overall_score >= 60
                      ? 'text-warning-600'
                      : 'text-danger-600'
                  }`}>
                    {complianceScore.overall_score.toFixed(0)}%
                  </span>
                </div>
              </div>
            )}
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              className={`p-2 rounded-full text-gray-500 hover:text-primary-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-200 ${isRefreshing ? 'bg-gray-100' : ''}`}
              aria-label="Refresh data"
            >
              <RefreshCw className={`h-5 w-5 ${isRefreshing ? 'animate-spin text-primary-500' : ''}`} />
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowNotification(!showNotification)}
                className="p-2 rounded-full text-gray-500 hover:text-primary-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 relative"
                aria-label="View notifications"
              >
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 block h-2 w-2 rounded-full bg-danger-500 ring-2 ring-white"></span>
              </button>
              
              {showNotification && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden transition-all duration-200 ease-out">
                  <div className="p-4 bg-primary-50 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                      <button
                        onClick={() => setShowNotification(false)}
                        className="p-1 rounded-full text-gray-400 hover:text-gray-500 hover:bg-white focus:outline-none"
                        aria-label="Close notifications"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-80 overflow-y-auto">
                    <div className="p-4 text-center">
                      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-3">
                        <Bell className="h-6 w-6 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500">No new notifications</p>
                      <p className="text-xs text-gray-400 mt-1">We'll notify you when something important happens</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="relative ml-1">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                id="user-menu-button"
                aria-expanded={showUserMenu}
                aria-haspopup="true"
              >
                <span className="sr-only">Open user menu</span>
                <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium overflow-hidden">
                  <User className="h-5 w-5 text-primary-600" />
                </div>
                <ChevronDown className="ml-1 h-4 w-4 text-gray-400 hidden sm:block" />
              </button>
              
              {showUserMenu && (
                <div 
                  className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none divide-y divide-gray-100 z-50"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                >
                  <div className="py-1" role="none">
                    <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
                      <User className="mr-3 h-4 w-4 text-gray-400" />
                      <span>Your Profile</span>
                    </a>
                    <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
                      <Settings className="mr-3 h-4 w-4 text-gray-400" />
                      <span>Settings</span>
                    </a>
                  </div>
                  <div className="py-1" role="none">
                    <a href="#" className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100" role="menuitem">
                      <LogOut className="mr-3 h-4 w-4 text-gray-400" />
                      <span>Sign out</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;