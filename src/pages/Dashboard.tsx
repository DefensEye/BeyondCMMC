import React, { useState, useEffect } from 'react';
import ComplianceScoreCard from '../components/ComplianceScoreCard';
import SeverityDistributionCard from '../components/SeverityDistributionCard';
import FindingsTable from '../components/FindingsTable';
import { useSupabase } from '../contexts/SupabaseContext';
import { Shield, ArrowRight, Clock, RefreshCw } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { loading } = useSupabase();
  const [animateIn, setAnimateIn] = useState(false);
  
  useEffect(() => {
    // Trigger animations after component mounts
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className={`bg-white rounded-xl shadow-sm p-6 border border-gray-100 transition-all duration-500 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="flex items-center">
            <Shield className="h-8 w-8 text-primary-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Security Overview</h1>
              <p className="text-sm text-gray-500 mt-1 flex items-center">
                <Clock className="h-4 w-4 mr-1" />
                {currentDate}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg">
            {loading ? (
              <div className="flex items-center">
                <RefreshCw className="h-4 w-4 text-primary-500 mr-2 animate-spin" />
                <span className="text-sm font-medium text-gray-600">Refreshing data...</span>
              </div>
            ) : (
              <div className="flex items-center">
                <div className="h-2 w-2 rounded-full bg-success-500 mr-2"></div>
                <span className="text-sm font-medium text-gray-600">Data updated</span>
              </div>
            )}
          </div>
        </div>
      </div>
      

      {/* Main Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-6 transition-all duration-500 delay-200 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <ComplianceScoreCard />
        <SeverityDistributionCard />
      </div>

      {/* Findings Table */}
      <div className={`transition-all duration-500 delay-300 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Recent Findings</h2>
            <p className="text-sm text-gray-500 mt-1">Latest security issues detected in your system</p>
          </div>
          
          <FindingsTable limit={5} />
          
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <div className="flex justify-end">
              <a 
                href="/findings"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                View all findings
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;