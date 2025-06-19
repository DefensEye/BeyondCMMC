import React, { useState, useEffect } from 'react';
import ComplianceScoreCard from '../components/ComplianceScoreCard';
import SeverityDistributionCard from '../components/SeverityDistributionCard';
import FindingsTable from '../components/FindingsTable';
import { useSupabase } from '../contexts/SupabaseContext';
import { Shield, ArrowRight, Clock, RefreshCw, FileText, Download } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { loading } = useSupabase();
  const [animateIn, setAnimateIn] = useState(false);
  const [isGeneratingSSP, setIsGeneratingSSP] = useState(false);
  const [showSSPModal, setShowSSPModal] = useState(false);
  const [sspContent, setSSPContent] = useState('');
  
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

  const handleGenerateSSP = async () => {
    setIsGeneratingSSP(true);
    
    try {
      const response = await fetch('http://localhost:8000/generate-ssp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_name: 'Your Organization',
          system_name: 'Security Monitoring System',
          system_description: 'Cloud-based security monitoring and compliance system for CMMC Level 2 certification',
          responsible_party: 'Security Team',
          contact_email: 'security@yourorg.com'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate SSP');
      }
      
      const data = await response.json();
      setSSPContent(data.ssp_content);
      setShowSSPModal(true);
    } catch (error) {
      console.error('Error generating SSP:', error);
      alert('Failed to generate SSP. Please try again.');
    } finally {
      setIsGeneratingSSP(false);
    }
  };
  
  const downloadSSP = () => {
    const blob = new Blob([sspContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SSP_CMMC_Level2_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
          
          <div className="flex items-center space-x-4">
            {/* Generate SSP Button */}
            <button
              onClick={handleGenerateSSP}
              disabled={isGeneratingSSP}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              {isGeneratingSSP ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              {isGeneratingSSP ? 'Generating...' : 'Generate SSP'}
            </button>
            
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
      
      {/* SSP Modal */}
      {showSSPModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Generated System Security Plan</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={downloadSSP}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </button>
                <button
                  onClick={() => setShowSSPModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono bg-gray-50 p-4 rounded-lg">
                {sspContent}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;