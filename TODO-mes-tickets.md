# TODO — Page "Mes Tickets" (après login)

## Contexte

Une fois l'utilisateur authentifié (via login SQLite/Spring Boot),
son `username` est stocké en `sessionStorage`.
Cette page récupère ses tickets depuis **l'API GLPI** et les filtre par son nom.

---

## Architecture

```
React MesTickets  ──GET /Assistance/Ticket──→  GLPI API
                        filtrage par username (sessionStorage)
```

---

## PARTIE 1 — Composant `MesTickets.jsx`

Fichier : `src/pages/frontoffice/MesTickets.jsx`

```jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchGlpiData } from '../../services/apiClient';
import { logoutUser } from '../../services/authService';

export default function MesTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate              = useNavigate();
  const userLogin             = sessionStorage.getItem('userLogin');

  useEffect(() => {
    fetchGlpiData('/Assistance/Ticket?expand_dropdowns=true')
      .then(data => {
        const all = Array.isArray(data) ? data : (data?.data || []);

        // Garder uniquement les tickets dont le demandeur = userLogin
        const mine = all.filter(t =>
          t.user_recipient?.name === userLogin ||
          t.team?.find(m => m.role === 'requester')?.name === userLogin
        );

        setTickets(mine);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [userLogin]);

  const handleLogout = () => {
    logoutUser();
    navigate('/login');
  };

  if (loading) return (
    <div className="p-10 text-center text-neutral-500">Chargement de vos tickets...</div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">

      {/* En-tête */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-black">Mes Tickets</h2>
          <p className="text-neutral-500 text-sm mt-1">
            Connecté en tant que <strong>{userLogin}</strong> — {tickets.length} ticket(s)
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-red-500 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition"
        >
          Se déconnecter
        </button>
      </div>

      {/* Tableau des tickets */}
      <table className="w-full text-sm border border-neutral-200 rounded-xl overflow-hidden">
        <thead className="bg-neutral-50 text-neutral-600 font-semibold">
          <tr>
            <th className="px-4 py-3 text-left">ID</th>
            <th className="px-4 py-3 text-left">Titre</th>
            <th className="px-4 py-3 text-left">Statut</th>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-left">Priorité</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {tickets.length > 0 ? tickets.map(t => (
            <tr key={t.id} className="hover:bg-neutral-50 transition-colors">
              <td className="px-4 py-3 text-neutral-400">{t.id}</td>
              <td className="px-4 py-3 font-medium text-black">{t.name || 'Sans titre'}</td>
              <td className="px-4 py-3">{t.status?.name || t.status || '—'}</td>
              <td className="px-4 py-3 text-neutral-500">{t.date?.slice(0, 10) || '—'}</td>
              <td className="px-4 py-3">{t.priority?.name || t.priority || '—'}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan="5" className="px-4 py-10 text-center text-neutral-400 italic">
                Aucun ticket trouvé pour votre compte.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
```

---

## PARTIE 2 — Intégration dans l'app

### 2.1 Route protégée dans `App.jsx`

```jsx
import MesTickets         from './pages/frontoffice/MesTickets';
import UserProtectedRoute from './components/layouts/UserProtectedRoute';

// Dans <Routes> :
<Route path="mes-tickets" element={
  <UserProtectedRoute><MesTickets /></UserProtectedRoute>
} />
```

### 2.2 Lien dans la sidebar — `SidebarLayout.jsx`

```js
const isUserAuth = sessionStorage.getItem('isUserAuth') === 'true';

// Dans navItems :
!isUserAuth && !isBackOfficeAuth && { to: '/login',       label: 'Connexion',   icon: HomeIcon   },
isUserAuth  &&                      { to: '/mes-tickets', label: 'Mes Tickets', icon: TicketIcon },
```

---

## PARTIE 3 — Logique de filtrage détaillée

L'API GLPI retourne tous les tickets. Le filtrage se fait côté client :

```js
const mine = all.filter(ticket =>
  // Cas 1 : champ user_recipient (demandeur principal)
  ticket.user_recipient?.name === userLogin ||
  // Cas 2 : tableau team avec rôle 'requester'
  ticket.team?.find(member => member.role === 'requester')?.name === userLogin
);
```

> **Si le username GLPI diffère du username SQLite**, il faut soit :
> - Stocker aussi le `glpi_username` dans la table `users` SQLite,
> - Ou ajouter une correspondance dans le backend Spring Boot lors du login.

---

## Résumé des fichiers

| Fichier | Action |
|---------|--------|
| `src/pages/frontoffice/MesTickets.jsx` | **CRÉER** |
| `src/App.jsx` | **MODIFIER** — route `/mes-tickets` protégée |
| `src/components/layouts/SidebarLayout.jsx` | **MODIFIER** — nav conditionnelle |
| `src/components/layouts/UserProtectedRoute.jsx` | **CRÉER** (voir `TODO-login-sqlite.md`) |
| `src/services/authService.js` | **CRÉER** (voir `TODO-login-sqlite.md`) |
