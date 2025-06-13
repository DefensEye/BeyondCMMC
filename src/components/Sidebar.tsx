import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Settings, X, BarChart2, Shield, AlertTriangle, HelpCircle, ExternalLink, UploadCloud } from 'lucide-react';

interface SidebarProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ open, setOpen }) => {
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  
  // Animation effect on mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const navigation = [
    { name: 'Dashboard', href: '/', icon: BarChart2, badge: null },
    { name: 'Findings', href: '/findings', icon: AlertTriangle, badge: null },
    // { name: 'Compliance', href: '/compliance', icon: Shield, badge: null },
    { name: 'Settings', href: '/settings', icon: Settings, badge: null },
    { name: 'Upload Findings', href: '/upload-findings', icon: UploadCloud, badge: null },
  ];
  
  const resourceLinks = [
    // { name: 'Documentation', href: '#', icon: HelpCircle },
  ];

  return (
    <>
      {/* Mobile sidebar overlay */}
      {open && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden backdrop-blur-sm transition-opacity duration-300 ease-in-out" 
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl transform transition-all duration-300 ease-in-out lg:hidden ${
          open ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-100">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-primary-600" />
            <span className="ml-2 text-lg font-semibold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">DefenseEye</span>
          </div>
          <button
            type="button"
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            onClick={() => setOpen(false)}
          >
            <span className="sr-only">Close sidebar</span>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        
        <div className="overflow-y-auto h-full pb-20">
          <div className="px-4 pt-5 pb-4">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Main</p>
          </div>
          <nav>
            <ul className="space-y-1 px-2">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                      location.pathname === item.href
                        ? 'text-primary-700 bg-primary-50 shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                    onClick={() => setOpen(false)}
                  >
                    <div className="flex items-center">
                      <item.icon
                        className={`mr-3 h-5 w-5 transition-colors duration-200 ${
                          location.pathname === item.href ? 'text-primary-600' : 'text-gray-400'
                        }`}
                        aria-hidden="true"
                      />
                      {item.name}
                    </div>
                    {item.badge && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
            
            <div className="px-4 pt-5 pb-2 mt-6">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Resources</p>
            </div>
            <ul className="space-y-1 px-2">
              {resourceLinks.map((item) => (
                <li key={item.name}>
                  <a
                    href={item.href}
                    className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                  >
                    <item.icon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          
          <div className="px-4 mt-10">
            <div className="rounded-lg bg-gradient-to-br from-primary-50 to-accent-50 p-4 shadow-sm border border-primary-100">
              <h3 className="text-sm font-medium text-primary-800 mb-2">Need help?</h3>
              <p className="text-xs text-gray-600 mb-3">Check our documentation for guides and API references</p>
              <a href="#" className="text-xs font-medium text-primary-700 hover:text-primary-800 flex items-center">
                View documentation
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className={`hidden lg:flex lg:flex-shrink-0 transition-all duration-500 ease-in-out ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-screen border-r border-gray-100 bg-white shadow-sm">
            <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-gray-100">
              <Shield className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-lg font-semibold bg-gradient-to-r from-primary-600 to-accent-500 bg-clip-text text-transparent">DefenseEye</span>
            </div>
            
            <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
              <div className="px-4 pb-2">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Main</p>
              </div>
              
              <nav className="flex-1 px-2 space-y-1">
                <ul>
                  {navigation.map((item, index) => (
                    <li key={item.name} style={{ animationDelay: `${index * 100}ms` }} className={`${mounted ? 'animate-fadeIn' : 'opacity-0'}`}>
                      <Link
                        to={item.href}
                        className={`flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 ${
                          location.pathname === item.href
                            ? 'text-primary-700 bg-primary-50 shadow-sm'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center">
                          <item.icon
                            className={`mr-3 h-5 w-5 transition-colors duration-200 ${
                              location.pathname === item.href ? 'text-primary-600' : 'text-gray-400'
                            }`}
                            aria-hidden="true"
                          />
                          {item.name}
                        </div>
                        {item.badge && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-danger-100 text-danger-800">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
                
                <div className="px-2 pt-5 pb-2 mt-6">
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Resources</p>
                </div>
                <ul>
                  {resourceLinks.map((item, index) => (
                    <li key={item.name} style={{ animationDelay: `${(navigation.length + index) * 100}ms` }} className={`${mounted ? 'animate-fadeIn' : 'opacity-0'}`}>
                      <a
                        href={item.href}
                        className="flex items-center px-4 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                      >
                        <item.icon className="mr-3 h-5 w-5 text-gray-400" aria-hidden="true" />
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
              
              <div className="px-4 mt-auto mb-6">
                <div className="rounded-lg bg-gradient-to-br from-primary-50 to-accent-50 p-4 shadow-sm border border-primary-100 transform transition-all duration-300 hover:scale-105">
                  <h3 className="text-sm font-medium text-primary-800 mb-2">Need help?</h3>
                  <p className="text-xs text-gray-600 mb-3">Check our documentation for guides and API references</p>
                  <a href="#" className="text-xs font-medium text-primary-700 hover:text-primary-800 flex items-center">
                    View documentation
                    <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;