/**
 * Gold Analysis System - 主應用
 */
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '@components/layout';
import Dashboard from '@components/pages/Dashboard';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        {/* 其他頁面預留 */}
      </Routes>
    </MainLayout>
  );
}

export default App;
