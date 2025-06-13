import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface GoogleCloudConfig {
  project_id: string;
  organization_id: string;
  client_email: string;
  findings_lookback_days: number;
}

const SettingsPage: React.FC = () => {
  const [googleConfig, setGoogleConfig] = useState<GoogleCloudConfig>({
    project_id: import.meta.env.VITE_GOOGLE_PROJECT_ID || '',
    organization_id: import.meta.env.VITE_GOOGLE_ORGANIZATION_ID || '',
    client_email: import.meta.env.VITE_GOOGLE_CLIENT_EMAIL || '',
    findings_lookback_days: parseInt(import.meta.env.VITE_FINDINGS_LOOKBACK_DAYS || '365', 10)
  });
  
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .single();
      
      if (error) throw error;
      
      if (data) {
        setGoogleConfig({
          project_id: data.google_project_id || googleConfig.project_id,
          organization_id: data.google_organization_id || googleConfig.organization_id,
          client_email: data.google_client_email || googleConfig.client_email,
          findings_lookback_days: data.findings_lookback_days || googleConfig.findings_lookback_days
        });
        
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };
  
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({
          google_project_id: googleConfig.project_id,
          google_organization_id: googleConfig.organization_id,
          google_client_email: googleConfig.client_email,
          findings_lookback_days: googleConfig.findings_lookback_days,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };
  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure your security dashboard preferences.
        </p>
      </div>
      
      {/* Google Cloud Configuration */}
      <div className="bg-white shadow-md rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Google Cloud Configuration</h3>
          <div className="mt-2 max-w-xl text-sm text-gray-500">
            <p>Configure your Google Cloud credentials and settings.</p>
          </div>
          <form className="mt-5 space-y-5" onSubmit={handleSaveSettings}>
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
              <div>
                <label htmlFor="project-id" className="block text-sm font-medium text-gray-700">
                  Project ID
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="project-id"
                    value={googleConfig.project_id}
                    onChange={(e) => setGoogleConfig({ ...googleConfig, project_id: e.target.value })}
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="organization-id" className="block text-sm font-medium text-gray-700">
                  Organization ID
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="organization-id"
                    value={googleConfig.organization_id}
                    onChange={(e) => setGoogleConfig({ ...googleConfig, organization_id: e.target.value })}
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-2">
                <label htmlFor="client-email" className="block text-sm font-medium text-gray-700">
                  Service Account Email
                </label>
                <div className="mt-1">
                  <input
                    type="email"
                    id="client-email"
                    value={googleConfig.client_email}
                    onChange={(e) => setGoogleConfig({ ...googleConfig, client_email: e.target.value })}
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="lookback-days" className="block text-sm font-medium text-gray-700">
                  Findings Lookback (days)
                </label>
                <div className="mt-1">
                  <input
                    type="number"
                    id="lookback-days"
                    min="1"
                    max="365"
                    value={googleConfig.findings_lookback_days}
                    onChange={(e) => setGoogleConfig({ ...googleConfig, findings_lookback_days: parseInt(e.target.value, 10) })}
                    className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;