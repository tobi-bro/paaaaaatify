import React from 'react';
import { Home, Search, Library, Users, User } from 'lucide-react';

export type TabType = 'home' | 'search' | 'library' | 'group' | 'profile';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'home' as TabType, label: 'Home', icon: Home },
    { id: 'search' as TabType, label: 'Search', icon: Search },
    { id: 'library' as TabType, label: 'Your Library', icon: Library },
    { id: 'group' as TabType, label: 'Group', icon: Users },
    { id: 'profile' as TabType, label: 'Profile', icon: User },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#08090D]/95 backdrop-blur-xl border-t border-[#1B1E28] max-w-md mx-auto">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 transition-colors relative ${
                isActive ? 'text-[#1ED760]' : 'text-[#71717A] hover:text-white'
              }`}
            >
              <Icon className={`w-6 h-6 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'font-semibold text-[#1ED760]' : ''}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#1ED760] shadow-[0_0_8px_#1ED760]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

