/**
 * Gold Analysis System - 主應用
 */
import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '@components/layout';
import Dashboard from '@components/pages/Dashboard';
import Chart from '@components/pages/Chart';
import Analysis from '@components/pages/Analysis';
import Summary from '@components/pages/Summary';
import TechnicalsPage from '@components/pages/TechnicalsPage';
import ForwardCurvePage from '@components/pages/ForwardCurvePage';
import News from '@components/pages/News';
import History from '@components/pages/History';
import Settings from '@components/pages/Settings';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/summary" element={<Summary />} />
        <Route path="/chart" element={<Chart />} />
        <Route path="/analysis" element={<Analysis />} />
        <Route path="/technicals" element={<TechnicalsPage />} />
        <Route path="/forward-curve" element={<ForwardCurvePage />} />
        <Route path="/history" element={<History />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
