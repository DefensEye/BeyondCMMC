import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { ExternalLink, ChevronDown, ChevronUp, AlertTriangle, AlertOctagon, AlertCircle, Info, Shield, RefreshCw, RotateCcw } from 'lucide-react';
import { Finding } from '../lib/supabase';
import { useSupabase } from '../contexts/SupabaseContext';


interface FindingsTableProps {
  limit?: number;
  showPagination?: boolean;
  filters?: {
    category: string;
    status: string;
  };
  externalData?: Finding[]; // New prop for externally provided data
}

const FindingsTable: React.FC<FindingsTableProps> = ({ 
  limit = Infinity, 
  showPagination = false,
  filters = { category: '', status: '' },
  externalData
}) => {
  const { findings: supabaseFindings, loading: supabaseLoading, refreshData: supabaseRefreshData } = useSupabase();
  // Remove this line
  // Initialize isExternalData state with the value from props, but don't update it in useEffect
  const [isExternalData, setIsExternalData] = useState(!!externalData);
  
  // Update the useEffect to only run when externalData changes from defined to undefined or vice versa
  useEffect(() => {
  // Only update state if the "existence" of externalData changes (from null to data or vice versa)
  const hasExternalData = !!externalData;
  if (hasExternalData !== isExternalData) {
    setIsExternalData(hasExternalData);
  }
  }, [externalData, isExternalData]);

  // Determine the source of findings and loading state
  const findings = externalData || supabaseFindings;
  const loading = isExternalData ? false : supabaseLoading; // If externalData, not loading from supabase

  // Refresh function should be context-aware
  const refreshData = async () => {
    if (!isExternalData) {
      await supabaseRefreshData();
    }
    // If it's external data, refresh is handled outside this component (e.g., re-upload)
  };
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<keyof Finding>('severity');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [internalSelectedSeverity, setInternalSelectedSeverity] = useState<string>('');
  const [mainBarSelectedCategory, setMainBarSelectedCategory] = useState<string>('');
  const [mainBarSelectedStatus, setMainBarSelectedStatus] = useState<string>('');
  const [mainBarSelectedDomain, setMainBarSelectedDomain] = useState<string>('');
  // Replace this line:
  // const [showFilters, setShowFilters] = useState(false);
  
  // With this:
  const showFilters = false; // or true if you want filters always visible
  
  // Animation states
  const [fadeIn, setFadeIn] = useState(false);
  
  useEffect(() => {
    setFadeIn(true);
    return () => setFadeIn(false);
  }, []);
  
  useEffect(() => {
    // If externalData changes, update the state
    setIsExternalData(!!externalData);
  }, [externalData]);

  // Apply external filters when they change
  useEffect(() => {
    if (filters?.category) {
      setSelectedCategories([filters.category]);
    } else if (filters && 'category' in filters && !filters.category) {
      setSelectedCategories([]);
    }
    
    if (filters?.status) {
      setSelectedStatuses([filters.status]);
    } else if (filters && 'status' in filters && !filters.status) {
      setSelectedStatuses([]);
    }
    
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [filters]);
  
  // Get unique values for filter dropdowns
  const uniqueCategories = findings ? [...new Set(findings.map(f => f.category))].filter(Boolean) : [];
  const uniqueStatuses = findings ? [...new Set(findings.map(f => f.status))].filter(Boolean) : [];
  const uniqueDomains = findings ? [...new Set(findings.map(f => f.domain))].filter((domain): domain is string => !!domain) : [];
  
  const itemsPerPage = 10;
  
  // Handle refresh
  const handleRefresh = async () => {
    if (!isExternalData) {
      setIsRefreshing(true);
      await refreshData(); // This now correctly calls supabaseRefreshData if not external
      setTimeout(() => setIsRefreshing(false), 600);
    }
    // No refresh action within table for external data
  };
  
  const toggleCategoryFilter = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category) 
        : [...prev, category]
    );
  };
  
  const toggleStatusFilter = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status) 
        : [...prev, status]
    );
  };

  const toggleDomainFilter = (domain: string) => {
    setSelectedDomains(prev => 
      prev.includes(domain) 
        ? prev.filter(d => d !== domain) 
        : [...prev, domain]
    );
  };
  
  // Clear all filters
  const clearFilters = () => {
    setInternalSelectedSeverity('');
    setMainBarSelectedCategory('');
    setMainBarSelectedStatus('');
    setMainBarSelectedDomain('');
    setSelectedCategories([]);
    setSelectedStatuses([]);
    setSelectedDomains([]);
    setSearchTerm('');
  };
  
  // Show refresh button only if not using external data
  const showRefreshButton = !isExternalData;

  const [domainDropdownOpen, setDomainDropdownOpen] = useState(false);
  const domainDropdownRef = useRef<HTMLDivElement>(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (domainDropdownRef.current && !domainDropdownRef.current.contains(event.target as Node)) {
        setDomainDropdownOpen(false);
      }
    }
    
    if (domainDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [domainDropdownOpen]);

  if (loading && !isExternalData) { // Only show main loading skeleton if fetching from Supabase
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-1/6 animate-pulse"></div>
        </div>
        <div className="h-10 bg-gray-100 rounded w-full mb-6 animate-pulse"></div>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
          ))}
        </div>
      </div>
    );
  }
  
  // Fix: Check for undefined findings first, then check length
  if (!findings || findings.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Security Findings</h2>
        <div className="flex flex-col items-center justify-center py-6">
          <div className="p-3 rounded-full bg-gray-100 mb-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600">No security findings available.</p>
        </div>
      </div>
    );
  }

  // Filter findings with simplified logic and type assertions
  const filteredFindings = findings ? findings.filter((finding) => {
    // Skip invalid findings
    if (!finding) return false;
    
    // For TypeScript type safety, create a typed copy
    const typedFinding = finding as Required<Finding>;
    
    // Search term filtering
    const searchMatch = searchTerm === '' || 
      String(typedFinding.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(typedFinding.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(typedFinding.resource_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter selections
    const severityMatch = !internalSelectedSeverity || // True if no severity is selected (show all)
      (typedFinding.severity === internalSelectedSeverity);

    // Category match: main bar selection takes precedence. If 'All', then multi-select from collapsible filter applies.
    const categoryMatch = mainBarSelectedCategory === '' 
      ? (selectedCategories.length === 0 || (typedFinding.category && selectedCategories.includes(typedFinding.category))) 
      : (typedFinding.category === mainBarSelectedCategory);

    // Status match: main bar selection takes precedence. If 'All', then multi-select from collapsible filter applies.
    const statusMatch = mainBarSelectedStatus === ''
      ? (selectedStatuses.length === 0 || (typedFinding.status && selectedStatuses.includes(typedFinding.status)))
      : (typedFinding.status === mainBarSelectedStatus);
      
    // Domain match
    const domainMatch = selectedDomains.length === 0 || 
      (typedFinding.domain && selectedDomains.includes(typedFinding.domain));
    
    return searchMatch && severityMatch && categoryMatch && statusMatch && domainMatch;
  }) : [];
  
  // Sort findings with safe access to potentially undefined properties
  const sortedFindings = [...filteredFindings].sort((a, b) => {
    // Handle potentially undefined values by providing defaults
    const aValue = a[sortField] || '';
    const bValue = b[sortField] || '';
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  // Apply pagination if enabled
  const paginatedFindings = showPagination
    ? sortedFindings.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : sortedFindings.slice(0, limit);

  const totalPages = Math.ceil(sortedFindings.length / itemsPerPage);

  const toggleSort = (field: keyof Finding) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const toggleRowExpand = (id: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <AlertOctagon className="h-5 w-5 text-danger-600" />;
      case 'HIGH':
        return <AlertTriangle className="h-5 w-5 text-accent-600" />;
      case 'MEDIUM':
        return <AlertCircle className="h-5 w-5 text-warning-600" />;
      case 'LOW':
        return <Info className="h-5 w-5 text-primary-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-400" />;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-danger-100 text-danger-800';
      case 'HIGH':
        return 'bg-accent-100 text-accent-800';
      case 'MEDIUM':
        return 'bg-warning-100 text-warning-800';
      case 'LOW':
        return 'bg-primary-100 text-primary-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300 ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      {/* Header and Control Bar */}
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-3 sm:space-y-0">
          {/* Title and Findings Count */}
          <div className="flex items-center">
            <Shield className="h-6 w-6 text-primary-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-800">Security Findings</h2>
            <span className="ml-3 px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
              {filteredFindings.length} findings
            </span>
          </div>
          
          {/* Control Bar: Search, Refresh, Filter Toggle, Clear Filters */}
          <div className="flex items-center space-x-2 flex-wrap">
            {/* Severity Filter Dropdown (Main Bar) */}
            <div>
              <label htmlFor="main-severity-filter" className="sr-only">Severity</label>
              <select
                id="main-severity-filter"
                value={internalSelectedSeverity}
                onChange={(e) => setInternalSelectedSeverity(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-full sm:w-auto bg-white"
              >
                <option value="">All Severities</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="LOW">LOW</option>
              </select>
            </div>

            {/* Domain Filter Dropdown (Main Bar) */}
            <div className="relative" ref={domainDropdownRef}>
              <label htmlFor="main-domain-filter" className="sr-only">Domain</label>
              <button
                id="main-domain-filter"
                onClick={() => setDomainDropdownOpen(!domainDropdownOpen)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-full sm:w-auto bg-white flex items-center justify-between min-w-[180px]"
              >
                <span>{selectedDomains.length === 0 ? "All Domains" : `${selectedDomains.length} Domain${selectedDomains.length > 1 ? 's' : ''}`}</span>
                <ChevronDown className="h-4 w-4 ml-2" />
              </button>
              
              {domainDropdownOpen && (
                <div className="absolute z-10 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-2 border-b border-gray-200">
                    <button 
                      onClick={() => {
                        setSelectedDomains([]);
                        setDomainDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="p-2">
                    {uniqueDomains.map(domain => (
                      <div key={domain} className="flex items-center px-3 py-2 hover:bg-gray-100 rounded-md">
                        <input
                          type="checkbox"
                          id={`domain-${domain}`}
                          checked={selectedDomains.includes(domain)}
                          onChange={() => {
                            toggleDomainFilter(domain);
                          }}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <label
                          htmlFor={`domain-${domain}`}
                          className="ml-2 block text-sm text-gray-700 cursor-pointer w-full"
                        >
                          {domain}
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="p-2 border-t border-gray-200 flex justify-end">
                    <button
                      onClick={() => setDomainDropdownOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search findings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-primary-500 focus:border-primary-500 w-full sm:w-auto"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {/* <Search className="h-4 w-4 text-gray-400" /> Add Search icon from lucide if not already present or if desired */}
              </div>
            </div>

            {/* Conditionally render Refresh Button */} 
            {showRefreshButton && (
              <button 
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`p-2 rounded-full hover:bg-gray-100 transition-all ${isRefreshing ? 'animate-spin text-primary-600' : 'text-gray-500'}`}
                aria-label="Refresh data"
                title="Refresh data"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
            )}


            
            {/* Clear Filters Button - Only show if filters are visible or active */}
            {(showFilters || internalSelectedSeverity || selectedCategories.length > 0 || selectedStatuses.length > 0 || searchTerm) && (
              <button 
                onClick={clearFilters}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                title="Clear all filters"
              >
                 <RotateCcw className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Collapsible Filter Section */}
      {showFilters && (
        <div className={`px-6 py-4 border-b border-gray-200 bg-gray-50 transition-all duration-300 ease-in-out overflow-hidden ${showFilters ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
            {/* Severity Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
              <div className="flex space-x-2 flex-wrap">
                {[ { value: "CRITICAL", label: "Critical" }, { value: "HIGH", label: "High" }, { value: "MEDIUM", label: "Medium" }, { value: "LOW", label: "Low" } ].map((severityOpt) => (
                  <button
                    key={severityOpt.value}
                    type="button"
                    className={`px-3 py-1.5 border rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 transition-colors duration-150 mb-2
                      ${internalSelectedSeverity === severityOpt.value
                        ? 'bg-primary-600 text-white border-primary-600 hover:bg-primary-700'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    onClick={() => setInternalSelectedSeverity(prev => prev === severityOpt.value ? "" : severityOpt.value)}
                  >
                    {severityOpt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                {uniqueCategories.map(category => (
                  <button
                    key={category}
                    onClick={() => toggleCategoryFilter(category)}
                    className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors duration-150 flex items-center justify-between
                      ${selectedCategories.includes(category) 
                        ? 'bg-primary-100 text-primary-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {category}
                    {selectedCategories.includes(category) && <Shield className="h-4 w-4 text-primary-600" />}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-2">
                {uniqueStatuses.map(status => (
                  <button
                    key={status}
                    onClick={() => toggleStatusFilter(status)}
                    className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors duration-150 flex items-center justify-between
                      ${selectedStatuses.includes(status) 
                        ? 'bg-primary-100 text-primary-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {status}
                    {selectedStatuses.includes(status) && <Shield className="h-4 w-4 text-primary-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Domain Filter */}
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-2 grid grid-cols-1 md:grid-cols-2 gap-1">
                {uniqueDomains.map(domain => (
                  <button
                    key={domain}
                    onClick={() => toggleDomainFilter(domain)}
                    className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors duration-150 flex items-center justify-between
                      ${selectedDomains.includes(domain) 
                        ? 'bg-primary-100 text-primary-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    {domain}
                    {selectedDomains.includes(domain) && <Shield className="h-4 w-4 text-primary-600" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {/* Optionally, display a message about active filters or total results here */}
            </div>
            {/* The clear all filters button is now part of the main control bar, conditionally rendered. 
               If a separate clear button for this section is desired, it can be added here. */}
          </div>
        </div>
      )}

      {/* Table Content Area (and findings count, pagination below) */}
      <div className="px-6 py-4 border-t border-gray-200">
        <div className="text-sm text-gray-500">
          Showing {paginatedFindings.length} of {filteredFindings.length} findings. (Total: {findings?.length || 0})
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  className="flex items-center focus:outline-none"
                  onClick={() => toggleSort('severity')}
                >
                  Severity
                  {sortField === 'severity' && (
                    sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </button>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  className="flex items-center focus:outline-none"
                  onClick={() => toggleSort('category')}
                >
                  Category
                  {sortField === 'category' && (
                    sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </button>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <button 
                  className="flex items-center focus:outline-none"
                  onClick={() => toggleSort('domain')}
                >
                  Domain
                  {sortField === 'domain' && (
                    sortDirection === 'asc' ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />
                  )}
                </button>
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <span className="sr-only">Expand</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedFindings.map((finding) => (
              <React.Fragment key={finding.id}>
                <tr className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getSeverityIcon(finding.severity)}
                      <span className={`ml-2 inline-flex text-xs font-semibold rounded-full px-2 py-1 ${getSeverityClass(finding.severity)}`}>
                        {finding.severity}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{finding.category}</div>
                    <div className="text-xs text-gray-500 truncate max-w-xs">
                      {finding.resource_name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{finding.domain || "Not Classified"}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {finding.remediation_url ? (
                      <a
                        href={finding.remediation_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-900 inline-flex items-center"
                      >
                        Remediation <ExternalLink className="ml-1 h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-gray-400">No remediation link</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => toggleRowExpand(finding.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      {expandedRows.has(finding.id) ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </button>
                  </td>
                </tr>
                {expandedRows.has(finding.id) && (
                  <tr className="bg-gray-50 animate-slide-up">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="text-sm text-gray-700">
                        <h4 className="font-medium mb-2">Description</h4>
                        <p className="mb-4">{finding.description}</p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-gray-500">
                          <div>
                            <p><span className="font-medium">First observed:</span> {format(new Date(finding.first_observed), 'MMM d, yyyy h:mm a')}</p>
                            <p><span className="font-medium">Last observed:</span> {format(new Date(finding.last_observed), 'MMM d, yyyy h:mm a')}</p>
                          </div>
                          <div>
                            <p><span className="font-medium">Status:</span> {finding.status}</p>
                            <p><span className="font-medium">Resource:</span> {finding.resource_name}</p>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      
      {showPagination && totalPages > 1 && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(currentPage * itemsPerPage, sortedFindings.length)}
                </span>{' '}
                of <span className="font-medium">{sortedFindings.length}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                    currentPage === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  // Show pages around current page
                  const startPage = Math.max(1, currentPage - 2);
                  const pageNumber = startPage + i;
                  
                  if (pageNumber <= totalPages) {
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          pageNumber === currentPage
                            ? 'z-10 bg-primary-50 border-primary-500 text-primary-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  }
                  return null;
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                    currentPage === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Next</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FindingsTable;