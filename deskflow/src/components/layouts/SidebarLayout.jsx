import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { TicketIcon, HomeIcon, ResetIcon, DashboardIcon, BackOfficeIcon, ImportIcon, ElementIcon ,SettingIcon} from '../templates';
import { useLanguage } from '../../context/LanguageContext';

export default function SidebarLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation(); 
  const { lang, setLang, t } = useLanguage();

  const isBackOfficeAuth = sessionStorage.getItem('isBackOfficeAuth') === 'true';

  const navItems = [
    { to: '/', label: t('accueil', 'Accueil'), icon: HomeIcon },
    
    !isBackOfficeAuth && { to: '/tickets/new', label: t('nouveau_ticket', 'Nouveau Ticket'), icon: TicketIcon },
    !isBackOfficeAuth && { to: '/mes-elements', label: t('liste_elements', 'Liste des Éléments'), icon: ElementIcon },
    !isBackOfficeAuth && { to: '/backoffice', label: t('backoffice', 'BackOffice'), icon: BackOfficeIcon },
    !isBackOfficeAuth && { to: '/tickets/kanban', label: t('kanban_title', 'Tickets Kanban'), icon: TicketIcon },  
    isBackOfficeAuth && { to: '/reset', label: t('reset', 'Reset'), icon: ResetIcon },
    isBackOfficeAuth && { to: '/backoffice', label: t('backoffice', 'BackOffice'), icon: BackOfficeIcon },
    isBackOfficeAuth && { to: '/dashboard', label: t('dashboard', 'Dashboard'), icon: DashboardIcon},
    isBackOfficeAuth && { to: '/tickets', label: t('tickets', 'Tickets'), icon: TicketIcon },
    isBackOfficeAuth && { to: 'backoffice/colors', label: t('configuration', 'Configuration'), icon: SettingIcon}
    
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

        {/* Language Selector */}
        <div className="px-3 py-2 border-t border-neutral-800 flex flex-col gap-1">
          {!collapsed && <span className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold">Langue / Fiteny</span>}
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="w-full bg-neutral-900 text-white border border-neutral-800 rounded px-1 py-1 text-xs outline-none cursor-pointer hover:bg-neutral-800 transition-colors"
          >
            <option value="fr">{collapsed ? 'FR' : 'Français'}</option>
            <option value="mg">{collapsed ? 'MG' : 'Malagasy'}</option>
          </select>
        </div>

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
