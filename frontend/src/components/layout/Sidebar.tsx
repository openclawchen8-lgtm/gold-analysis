/**
 * 側邊欄導航
 */
import React from 'react';
import { NavLink } from 'react-router-dom';

const navItems = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/summary', label: 'Summary', icon: '📊' },
  { path: '/chart', label: 'Chart', icon: '📈' },
  { path: '/analysis', label: 'Analysis', icon: '🔍' },
  { path: '/news', label: 'News', icon: '📰' },
  { path: '/history', label: 'History', icon: '📜' },
  { path: '/settings', label: 'Settings', icon: '⚙️' },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-slate-800 border-r border-gray-700 min-h-screen">
      <div className="p-4">
        <div className="text-yellow-500 text-2xl mb-2">🥇</div>
        <div className="text-white font-semibold">Gold Analysis</div>
      </div>
      
      <nav className="mt-4">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 transition-colors ${
                isActive 
                  ? 'bg-yellow-500/20 text-yellow-500 border-r-2 border-yellow-500' 
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};
