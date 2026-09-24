import { useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Home, PlusCircle, LayoutDashboard } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function MobileBottomNav({ user, hasVendorProfile, hasClientProfile }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Store the last visited path per tab root
  const tabHistory = useRef({});

  const tabs = [
    { icon: Home, label: 'Accueil', root: '/' },
    { icon: Search, label: 'Explorer', root: createPageUrl('Marketplace') },
    { icon: PlusCircle, label: 'Publier', root: createPageUrl('PostRequest') },
    {
      icon: LayoutDashboard,
      label: 'Mon Espace',
      root: hasVendorProfile
        ? createPageUrl('VendorDashboard')
        : createPageUrl('ClientDashboard'),
    },
  ];

  const isTabActive = (tab) =>
    location.pathname === tab.root ||
    location.pathname.startsWith(tab.root === '/' ? '//' : tab.root);

  const handleTabPress = (tab) => {
    const active = isTabActive(tab);
    if (active) {
      // Re-tap: reset to root
      tabHistory.current[tab.root] = tab.root;
      navigate(tab.root, { replace: true });
    } else {
      // Navigate to last visited path in this tab's stack, or root
      const dest = tabHistory.current[tab.root] || tab.root;
      tabHistory.current[tab.root] = dest;
      navigate(dest);
    }
    // Track current path under active tab
    tabHistory.current[tab.root] = tab.root;
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-stone-950 border-t border-stone-200 dark:border-stone-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Navigation principale"
    >
      <div className="grid grid-cols-4 h-16">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isTabActive(tab);
          return (
            <button
              key={tab.root}
              onClick={() => handleTabPress(tab)}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors min-h-[44px] min-w-[44px] w-full ${
                active ? 'text-[#FF6B35]' : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-[#FF6B35]' : 'text-stone-400 dark:text-stone-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}