import React, { useState } from 'react';
import FindingsTable from '../components/FindingsTable';
import { useSupabase } from '../contexts/SupabaseContext';

const FindingsPage: React.FC = () => {
  const { findings, loading } = useSupabase();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({
    category: '',
    status: ''
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Security Findings</h1>
        <div className="text-sm text-gray-500">
          {loading ? (
            <span>Loading data...</span>
          ) : (
            <span>{findings.length} findings found</span>
          )}
        </div>
      </div>

      <FindingsTable 
        showPagination={true} 
        filters={appliedFilters}
      />
    </div>
  );
};

export default FindingsPage;