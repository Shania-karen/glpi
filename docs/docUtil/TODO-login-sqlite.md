# TODO — Login SQLite via Spring Boot

## Contexte

L'app Deskflow (React) utilise un backend **Spring Boot** qui gère une base **SQLite**.
L'objectif est de stocker les comptes utilisateurs dans SQLite et d'exposer un endpoint de login.

---

## Architecture

```
React (Deskflow :5173)  ──POST /api/login──→  Spring Boot (:8081)  ──→  SQLite (users.db)
```

---

## PARTIE 1 — Spring Boot

### 1.1 Table `users` dans SQLite

Ajouter dans `src/main/resources/data.sql` (ou via migration Flyway/Liquibase) :

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

### 1.2 Entité `User.java`

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

### 1.4 DTO `LoginRequest.java`

```java
public class LoginRequest {
    private String username;
    private String password;
    // getters / setters
}
```

---

### 1.5 Endpoint `POST /api/login` — `AuthController.java`

```java
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
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

> **Note sécurité :** En production, hasher les mots de passe avec `BCryptPasswordEncoder`.
> Pour une évaluation, la comparaison en clair est acceptable.

---

## PARTIE 2 — React (Deskflow)

### 2.1 `src/services/authService.js`

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

### 2.2 `src/pages/Login.jsx`

```jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/authService';

export default function Login() {
  const [form, setForm]     = useState({ username: '', password: '' });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const navigate            = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await loginUser(form.username, form.password);
      navigate('/mes-tickets');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <form onSubmit={handleSubmit}
        className="bg-white p-8 rounded-xl shadow border border-neutral-200 w-96 space-y-4">
        <h1 className="text-2xl font-bold text-black">Connexion</h1>
        {error && <p className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</p>}
        <input type="text" placeholder="Nom d'utilisateur"
          value={form.username}
          onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
          required
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
        />
        <input type="password" placeholder="Mot de passe"
          value={form.password}
          onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
          required
          className="w-full border border-neutral-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-black"
        />
        <button type="submit" disabled={loading}
          className="w-full bg-black text-white py-2 rounded-lg font-medium hover:bg-neutral-800 transition">
          {loading ? 'Connexion...' : 'Se connecter'}
        </button>
      </form>
    </div>
  );
}
```

---

### 2.3 `src/components/layouts/UserProtectedRoute.jsx`

```jsx
import { Navigate } from 'react-router-dom';

export default function UserProtectedRoute({ children }) {
  const isAuth = sessionStorage.getItem('isUserAuth') === 'true';
  return isAuth ? children : <Navigate to="/login" replace />;
}
```

---

### 2.4 Ajouter la route dans `App.jsx`

```jsx
import Login              from './pages/Login';
import UserProtectedRoute from './components/layouts/UserProtectedRoute';

// Route standalone (sans sidebar) :
<Route path="login" element={<Login />} />
```

---

## Résumé des fichiers

| Fichier | Action |
|---------|--------|
| Spring Boot : `data.sql` | **MODIFIER** — table `users` |
| Spring Boot : `User.java` | **CRÉER** |
| Spring Boot : `UserRepository.java` | **CRÉER** |
| Spring Boot : `AuthController.java` | **CRÉER** |
| `src/services/authService.js` | **CRÉER** |
| `src/pages/Login.jsx` | **CRÉER** |
| `src/components/layouts/UserProtectedRoute.jsx` | **CRÉER** |
| `src/App.jsx` | **MODIFIER** — route `/login` |
