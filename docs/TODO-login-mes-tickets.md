# TODO — Login SQLite (Spring Boot) + Page "Mes Tickets"

## Contexte

L'app Deskflow (React) communique déjà avec :
- **GLPI** via son API REST (tickets, éléments, etc.)
- **Spring Boot** qui gère une base **SQLite** locale

L'idée : stocker les **comptes utilisateurs** dans SQLite (géré par Spring Boot),
et permettre à un utilisateur connecté de voir **ses propres tickets** dans GLPI.

---

## Architecture globale

```
React (Deskflow :5173)
    │
    ├──→ Spring Boot (:8081)  ──→  SQLite (users.db)
    │         /api/login
    │         /api/users
    │
    └──→ GLPI API (:8080)     ──→  Tickets filtrés par username
```

---

## PARTIE 1 — Côté Spring Boot (SQLite)

### 1.1 Table `users` dans SQLite

Spring Boot doit exposer une table `users` dans le fichier SQLite.
Exemple de schema (à créer via migration ou `data.sql`) :

```sql
CREATE TABLE IF NOT EXISTS users (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT UNIQUE NOT NULL,
    password  TEXT NOT NULL,
    role      TEXT DEFAULT 'user'   -- 'user' ou 'admin'
);

-- Utilisateur de démo
INSERT OR IGNORE INTO users (username, password, role)
VALUES ('shania', 'motDePasse123', 'user');
```

---

### 1.2 Entité Java `User.java`

```java
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    private String role;

    // getters / setters
}
```

---

### 1.3 Repository `UserRepository.java`

```java
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
}
```

---

### 1.4 Endpoint `POST /api/login` dans `AuthController.java`

```java
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")  // URL du React
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest req) {
        Optional<User> userOpt = userRepository.findByUsername(req.getUsername());

        if (userOpt.isEmpty() || !userOpt.get().getPassword().equals(req.getPassword())) {
            return ResponseEntity.status(401).body(Map.of("error", "Identifiants incorrects"));
        }

        User user = userOpt.get();
        return ResponseEntity.ok(Map.of(
            "id",       user.getId(),
            "username", user.getUsername(),
            "role",     user.getRole()
        ));
    }
}
```

**DTO `LoginRequest.java` :**

```java
public class LoginRequest {
    private String username;
    private String password;
    // getters / setters
}
```

> **Note sécurité :** En production, il faut hasher les mots de passe avec `BCryptPasswordEncoder`.
> Pour l'évaluation, la comparaison en clair est acceptable.

---

## PARTIE 2 — Côté React (Deskflow)

### 2.1 Service d'authentification

Fichier : `src/services/authService.js`

```js
const SPRING_API = 'http://localhost:8081/api';

export async function loginUser(username, password) {
  const res = await fetch(`${SPRING_API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Erreur de connexion');
  }

  const data = await res.json();

  // Stocker la session côté navigateur
  sessionStorage.setItem('userLogin', data.username);
  sessionStorage.setItem('userRole', data.role);
  sessionStorage.setItem('isUserAuth', 'true');

  return data;
}

export function logoutUser() {
  sessionStorage.removeItem('userLogin');
  sessionStorage.removeItem('userRole');
  sessionStorage.removeItem('isUserAuth');
}
```

---

### 2.2 Page Login

Fichier : `src/pages/Login.jsx`

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/authService';

export default function Login() {
  const [form, setForm]   = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await loginUser(form.username, form.password);
      navigate('/mes-tickets');         // redirige après login
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow border border-neutral-200 w-96 space-y-4"
      >
        <h1 className="text-2xl font-bold text-black">Connexion</h1>

        {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>}

        <input
          type="text"
          placeholder="Nom d'utilisateur"
          value={form.username}
          onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
          required
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
        />
        <input
          type="password"
          placeholder="Mot de passe"
          value={form.password}
          onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
          required
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-2 rounded-lg font-medium hover:bg-neutral-800 transition"
        >
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
```

---

### 2.3 Guard de route utilisateur

Fichier : `src/components/layouts/UserProtectedRoute.jsx`

```jsx
import { Navigate } from 'react-router-dom';

export default function UserProtectedRoute({ children }) {
  const isAuth = sessionStorage.getItem('isUserAuth') === 'true';
  return isAuth ? children : <Navigate to="/login" replace />;
}
```

---

### 2.4 Page "Mes Tickets"

Fichier : `src/pages/frontoffice/MesTickets.jsx`

Les tickets sont récupérés depuis GLPI et filtrés par le `username` stocké en session.

```jsx
import { useState, useEffect } from 'react';
import { fetchGlpiData } from '../../services/apiClient';
import { useNavigate } from 'react-router-dom';
import { logoutUser } from '../../services/authService';

export default function MesTickets() {
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const navigate                = useNavigate();
  const userLogin               = sessionStorage.getItem('userLogin');

  useEffect(() => {
    fetchGlpiData('/Assistance/Ticket?expand_dropdowns=true')
      .then(data => {
        const all = Array.isArray(data) ? data : (data?.data || []);

        // Filtrer : garder uniquement les tickets dont le demandeur = userLogin
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

  if (loading) return <div className="p-10 text-center text-neutral-500">Chargement...</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
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

### 2.5 Ajouter les routes dans `App.jsx`

```jsx
import Login               from './pages/Login';
import MesTickets          from './pages/frontoffice/MesTickets';
import UserProtectedRoute  from './components/layouts/UserProtectedRoute';

// Dans <Routes> — SANS SidebarLayout (pages standalone) :
<Route path="login"       element={<Login />} />
<Route path="mes-tickets" element={<UserProtectedRoute><MesTickets /></UserProtectedRoute>} />
```

---

### 2.6 Lien dans la sidebar (optionnel)

Dans `SidebarLayout.jsx` :

```js
const isUserAuth = sessionStorage.getItem('isUserAuth') === 'true';

// Dans navItems :
!isUserAuth && !isBackOfficeAuth && { to: '/login', label: 'Connexion', icon: HomeIcon },
isUserAuth  && { to: '/mes-tickets', label: 'Mes Tickets', icon: TicketIcon },
```

---

## Résumé — Fichiers à créer / modifier

| Fichier | Action |
|---------|--------|
| Spring Boot : table `users` dans SQLite | **CRÉER** via `data.sql` ou migration |
| Spring Boot : `User.java` | **CRÉER** entité |
| Spring Boot : `UserRepository.java` | **CRÉER** repository |
| Spring Boot : `AuthController.java` | **CRÉER** endpoint `POST /api/login` |
| `src/services/authService.js` | **CRÉER** — appel Spring Boot |
| `src/pages/Login.jsx` | **CRÉER** — formulaire login |
| `src/components/layouts/UserProtectedRoute.jsx` | **CRÉER** — guard utilisateur |
| `src/pages/frontoffice/MesTickets.jsx` | **CRÉER** — tickets filtrés |
| `src/App.jsx` | **MODIFIER** — ajouter routes |
| `src/components/layouts/SidebarLayout.jsx` | **MODIFIER** — nav conditionnelle |
