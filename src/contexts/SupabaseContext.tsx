import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, Finding, ComplianceScore, SeverityCounts, fetchFindings, fetchComplianceScore, fetchFindingsBySeverity } from '../lib/supabase';

interface SupabaseContextType {
  findings: Finding[];
  complianceScore: ComplianceScore | null;
  severityCounts: SeverityCounts;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [findings, setFindings] = useState<Finding[]>([]);
  const [complianceScore, setComplianceScore] = useState<ComplianceScore | null>(null);
  const [severityCounts, setSeverityCounts] = useState<SeverityCounts>({
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [findingsData, scoreData, severityData] = await Promise.all([
        fetchFindings(),
        fetchComplianceScore(),
        fetchFindingsBySeverity()
      ]);
      
      setFindings(findingsData);
      setComplianceScore(scoreData);
      setSeverityCounts(severityData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to fetch data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    refreshData();
    
    // Set up subscription for real-time updates
    const subscription = supabase
      .channel('security_findings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'security_findings' }, () => {
        refreshData();
      })
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return (
    <SupabaseContext.Provider
      value={{
        findings,
        complianceScore,
        severityCounts,
        loading,
        error,
        refreshData
      }}
    >
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const context = useContext(SupabaseContext);
  if (context === undefined) {
    throw new Error('useSupabase must be used within a SupabaseProvider');
  }
  return context;
}