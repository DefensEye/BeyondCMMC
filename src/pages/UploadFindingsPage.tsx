import React, { useState, useCallback, ChangeEvent } from 'react';
import FindingsTable from '../components/FindingsTable';
import { Finding, Severity } from '../lib/supabase'; // Assuming Severity is exported here or adjust as needed
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import { UploadCloud, FileText, CheckCircle, AlertCircle } from 'lucide-react';

// Define the expected structure of a finding from the Excel file
// This needs to match the columns in your Excel file.
interface FindingData {
  id?: string | number;
  description?: string;
  severity?: 'Critical' | 'High' | 'Medium' | 'Low' | string; 
  category?: string;
  status?: 'Open' | 'Closed' | 'In Progress' | string;
  resource_name?: string;
  // Add any other columns you expect from the Excel file
  [key: string]: any; // Allows for additional, unspecified columns
}

const UploadFindingsPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<FindingData[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transformedFindings, setTransformedFindings] = useState<Finding[] | null>(null);
  const [fileName, setFileName] = useState<string>('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setParsedData(null);
    setSelectedFile(null);
    setFileName('');
    setTransformedFindings(null);
    
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError('File size exceeds 5MB. Please upload a smaller file.');
        event.target.value = ''; // Clear the input
        return;
      }
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        setError('Invalid file type. Please upload a CSV file (.csv).');
        event.target.value = '';
        return;
      }
      setSelectedFile(file);
      setFileName(file.name);
    } 
  };

  const clearSelection = () => {
    setSelectedFile(null);
    setParsedData(null);
    setError(null);
    setFileName('');
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = ''; // Resets the file input field
    }
  };

  const handleFileUpload = useCallback(() => {
    if (!selectedFile) {
      setError('No file selected. Please choose a file to process.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setParsedData(null);
    setTransformedFindings(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        // Simplified try block for debugging
        console.log('Attempting to process file data (simplified)...');
        if (e.target?.result) {
            console.log('File data present (simplified).');
        } else {
            throw new Error('File data could not be read (simplified check).');
        }
        // End of simplified try block

        /* --- Original Papa.parse logic remains commented below for next steps ---
        const csvData = e.target?.result;
        if (!csvData) {
          throw new Error('File data could not be read.');
        }
        Papa.parse(csvData as string, {
          header: true,
          skipEmptyLines: true,
          complete: (results: Papa.ParseResult<FindingData>) => {
            if (results.errors.length > 0) {
              console.error('CSV parsing errors:', results.errors);
              const firstErrorMessage = results.errors[0].message || 'Unknown parsing error';
              setError(`Failed to parse CSV file: ${firstErrorMessage}`);
              setIsLoading(false);
              return;
            }
            if (!results.data || results.data.length === 0) {
              setError('CSV file is empty or does not contain data rows.');
              setIsLoading(false);
              return;
            }
            setParsedData(results.data);
            const findings: Finding[] = results.data.map((item: FindingData) => { // Corrected type
              let firstObserved: string | undefined = undefined;
              if (item.first_observed) {
                try {
                  firstObserved = new Date(item.first_observed).toISOString();
                } catch (parseErr) { console.warn(`Could not parse first_observed date: ${item.first_observed}`, parseErr); }
              }
              let lastObserved: string | undefined = undefined;
              if (item.last_observed) {
                try {
                  lastObserved = new Date(item.last_observed).toISOString();
                } catch (parseErr) { console.warn(`Could not parse last_observed date: ${item.last_observed}`, parseErr); }
              }
              let normalizedSeverity: Severity = 'LOW';
              const severityString = String(item.severity).toUpperCase() as Severity;
              if (['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'].includes(severityString)) {
                normalizedSeverity = severityString;
              }
              return {
                id: item.id?.toString() || uuidv4(),
                description: item.description || 'No description provided',
                severity: normalizedSeverity,
                category: item.category || 'Uncategorized',
                status: item.status || 'Open',
                resource_name: item.resource_name || 'N/A',
                first_observed: firstObserved || new Date(0).toISOString(),
                last_observed: lastObserved || new Date().toISOString(),
                remediation_url: item.remediation_url || undefined,
              };
            });
            setTransformedFindings(findings);
            setIsLoading(false);
          },
          error: (err: Papa.ParseError) => {
            console.error('PapaParse error callback:', err);
            setError('Failed to parse CSV file: ' + err.message);
            setIsLoading(false);
          },
        });
        */ // --- End of original Papa.parse logic ---
      } catch (err: any) { // Catches errors from reading file or initial Papa.parse setup
        // Simplified catch block for debugging
        console.error('Error in simplified file processing:', err);
        setError('A simplified error occurred during file processing.');
        setIsLoading(false);
        // End of simplified catch block
      }
    };

    // reader.onerror = (err) => { ... }; // Stays commented for now

    reader.readAsText(selectedFile); // This is now active
   
  }, [selectedFile]);

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Upload Security Findings</h1>
        <p className="mt-2 text-md text-gray-600 leading-relaxed max-w-2xl">
          Select a CSV file (.csv) containing your security findings. The system will process the data and prepare it for dashboard visualization.
        </p>
      </header>

      {/* File Upload Section */}
      <div className="bg-white p-6 sm:p-8 rounded-xl shadow-lg border border-gray-200 mb-8">
        <div className="flex flex-col items-center space-y-6">
          <label
            htmlFor="file-upload"
            className={`relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 ease-in-out group 
                        ${isLoading ? 'border-gray-300 bg-gray-100 cursor-not-allowed' :
                          error ? 'border-danger-400 bg-danger-50 hover:border-danger-500' :
                          selectedFile && !transformedFindings ? 'border-success-400 bg-success-50 hover:border-success-500' : // Green if file selected & not yet processed
                          transformedFindings ? 'border-primary-400 bg-primary-50' : // Blueish if processed
                                       'border-gray-300 bg-gray-50 hover:border-primary-500'}`}
          >
            {isLoading ? (
              <div className="text-center p-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <p className="text-lg font-medium text-primary-700">Processing File...</p>
                <p className="text-sm text-gray-500">Please wait, this may take a moment.</p>
              </div>
            ) : error ? (
              <div className="text-center text-danger-600 p-4">
                <AlertCircle className="mx-auto h-12 w-12 mb-2" />
                <p className="text-lg font-medium">Upload Failed</p>
                <p className="text-sm break-words max-w-md px-2">{error}</p>
                <p className="text-xs mt-2 text-gray-500">Try again or select a different file.</p>
              </div>
            ) : transformedFindings ? (
               <div className="text-center text-primary-700 p-4">
                  <CheckCircle className="mx-auto h-12 w-12 mb-2" />
                  <p className="text-lg font-medium">File Processed Successfully!</p>
                  <p className="text-sm font-semibold truncate max-w-xs px-2 py-1 bg-primary-100 rounded-md mt-1">{fileName}</p>
                  <p className="text-xs text-gray-500 mt-2">Scroll down to view findings. Upload another file or clear selection.</p>
                </div>
            ) : selectedFile ? (
              <div className="text-center text-success-700 p-4">
                <CheckCircle className="mx-auto h-12 w-12 mb-2" />
                <p className="text-lg font-medium">File Ready for Processing!</p>
                <p className="text-sm font-semibold truncate max-w-xs px-2 py-1 bg-success-100 rounded-md mt-1">{fileName}</p>
                <p className="text-xs text-gray-500 mt-2">Click 'Process File' below.</p>
              </div>
            ) : (
              <div className="text-center text-gray-500 p-4 group-hover:text-primary-600 transition-colors">
                <UploadCloud className="mx-auto h-12 w-12 text-gray-400 group-hover:text-primary-500 transition-colors mb-2" />
                <p className="text-lg font-medium">Click to upload or drag & drop</p>
                <p className="text-sm">Supports: CSV (.csv)</p>
                <p className="text-xs mt-1 text-gray-400">(Max file size: 5MB)</p>
              </div>
            )}
            <input
              id="file-upload"
              name="file-upload"
              type="file"
              className="sr-only"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </label>

          {/* Action Buttons: Process and Clear Selection (before processing) */}
          {selectedFile && !isLoading && !transformedFindings && !error && (
            <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4 w-full sm:w-auto mt-4">
              <button
                type="button"
                onClick={handleFileUpload}
                className="w-full sm:w-auto px-8 py-3 text-base font-medium text-white bg-primary-600 rounded-lg shadow-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 transition-all duration-150 ease-in-out transform hover:scale-105 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={isLoading || !!error} // Redundant check for error here, but safe
              >
                <FileText className="w-5 h-5 mr-2" />
                Process File
              </button>
              <button
                type="button"
                onClick={clearSelection}
                className="w-full sm:w-auto px-8 py-3 text-base font-medium text-gray-700 bg-gray-100 rounded-lg shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:ring-offset-2 transition-all duration-150 ease-in-out"
              >
                Clear Selection
              </button>
            </div>
          )}

          {/* Button to clear selection if file is processed or an error occurred during processing */}
          {(transformedFindings || (error && selectedFile)) && !isLoading && (
             <button
                type="button"
                onClick={clearSelection}
                className="mt-4 px-6 py-2 text-sm font-medium text-primary-600 hover:text-primary-800 transition-colors"
              >
                Upload Another File or Clear Selection
              </button>
          )}
        </div>
      </div>

      {/* Display Transformed Data in FindingsTable */}
      {transformedFindings && !isLoading && !error && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Uploaded Findings</h2>
          <FindingsTable externalData={transformedFindings} />
        </div>
      )}

      {/* Optional: Raw Parsed Data Preview for Debugging */}
      {parsedData && !transformedFindings && !isLoading && !error && (
        <div className="mt-8 p-6 bg-gray-50 rounded-lg shadow">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">Raw Parsed Data Preview (First 5 rows)</h3>
          <p className="text-xs text-gray-500 mb-2">This is a raw preview before transformation. The table above will show the final view once processed.</p>
          <pre className="bg-white p-4 rounded-md text-sm overflow-x-auto max-h-96">
            {JSON.stringify(parsedData.slice(0, 5), null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default UploadFindingsPage;
