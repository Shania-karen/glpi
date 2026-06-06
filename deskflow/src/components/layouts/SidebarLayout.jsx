import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { TicketIcon, HomeIcon, ResetIcon, DashboardIcon,BackOfficeIcon,ImportIcon ,ElementIcon} from '../templates';

export default function SidebarLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation(); 

  const isBackOfficeAuth = sessionStorage.getItem('isBackOfficeAuth') === 'true';

  const navItems = [
    { to: '/', label: 'Accueil', icon: HomeIcon },
    
    !isBackOfficeAuth && { to: '/tickets/new', label: 'Nouveau Ticket', icon: TicketIcon },
    !isBackOfficeAuth && { to: '/mes-elements', label: 'Liste des Éléments', icon: ElementIcon },
    //!isBackOfficeAuth && { to: '/exemple', label: 'Exemple UI', icon: TicketIcon },
    !isBackOfficeAuth && { to: '/backoffice', label: 'BackOffice', icon: TicketIcon },
    
    isBackOfficeAuth && { to: '/reset', label: 'Reset', icon: ResetIcon },
    isBackOfficeAuth && { to: '/backoffice', label: 'BackOffice', icon: BackOfficeIcon },
    isBackOfficeAuth && { to: '/Import', label: 'Import', icon: ImportIcon },
    isBackOfficeAuth && { to: '/Dashboard', label: 'Dashboard', icon: DashboardIcon},
    isBackOfficeAuth && { to: '/tickets', label: 'Tickets', icon: TicketIcon }
  ].filter(Boolean);

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-black text-white transition-all duration-300 ${collapsed ? 'w-14' : 'w-56'
          }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-neutral-800">
          {!collapsed && (
            <span className="text-sm font-semibold tracking-tight whitespace-nowrap">
              DeskFlow
            </span>
          )}
          {collapsed && <span className="text-sm font-bold">D</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-0.5 px-2">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${isActive
                  ? 'bg-white text-black'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`
              }
            >
              <item.icon className="w-5 h-5" style={{ flexShrink: 0}}  />
              <p>&nbsp;</p>
              {!collapsed && <span className="whitespace-nowrap"> {item.label}</span>}

              {collapsed && <span className="whitespace-nowrap"> {item.label[0]}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Collapse */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="flex items-center justify-center h-10 border-t border-neutral-800 text-neutral-500 hover:text-white transition-colors cursor-pointer text-xs"
          aria-label={collapsed ? 'Ouvrir le menu' : 'Reduire le menu'}
        >
          {collapsed ? '>' : '<'}
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-neutral-50">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
