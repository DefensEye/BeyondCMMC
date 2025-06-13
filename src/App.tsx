import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import FindingsPage from './pages/FindingsPage';
import SettingsPage from './pages/SettingsPage';
import UploadFindingsPage from './pages/UploadFindingsPage';
import { SupabaseProvider } from './contexts/SupabaseContext';

function App() {
  return (
    <SupabaseProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="findings" element={<FindingsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="upload-findings" element={<UploadFindingsPage />} />
          </Route>
        </Routes>
      </Router>
    </SupabaseProvider>
  );
}

export default App;