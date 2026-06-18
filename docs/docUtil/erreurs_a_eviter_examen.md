# 🚨 Erreurs à éviter — Guide Examen Final

> Basé sur toutes les erreurs réelles commises et corrigées dans le projet ce jour.

---

## ⚛️ REACT — Erreurs Fréquentes

### ❌ 1. Appeler une fonction sans parenthèses dans un `onClick`

```jsx
// ❌ FAUX — référence la fonction, ne l'appelle PAS
onClick={() => { handleReouverture ; setRefusalMode(true); }}

// ✅ CORRECT
onClick={(e) => handleReouverture(e)}

// ✅ CORRECT aussi (sans event)
onClick={() => handleReouverture()}
```

> **Règle** : une fonction sans `()` = une référence. Avec `()` = un appel.

---

### ❌ 2. Oublier de parser la réponse `fetch()` en JSON

```js
// ❌ FAUX — data = Response object (pas les données !)
const data = await fetch(`/api/superCout/1`);
const cout = data.cout; // → undefined

// ✅ CORRECT
const res = await fetch(`/api/superCout/1`);
if (!res.ok) throw new Error('Erreur');
const data = await res.json(); // ← OBLIGATOIRE
const cout = data.cout;        // ✅ fonctionne
```

---

### ❌ 3. Utiliser un state React stale (obsolète) dans un handler

```js
// ❌ FAUX — setSourceCol est asynchrone, sourceCol = ancienne valeur
setSourceCol(sourceColId);
console.log(sourceCol); // affiche l'ANCIEN état

// ❌ FAUX dans onDrop — sourceCol pas encore mis à jour
if (sourceCol === 'termine' && ...) { ... }

// ✅ CORRECT — lire depuis dataTransfer (synchrone)
const sourceColId = e.dataTransfer.getData('sourceColumnId');
if (sourceColId === 'termine' && ...) { ... }
```

> **Règle** : ne jamais faire confiance à un state React juste après un `setState`. Il n'est mis à jour qu'au prochain render.

---

### ❌ 4. Double `if` au lieu de `if / else if / else`

```js
// ❌ FAUX — les deux blocs s'exécutent en cascade !
if (targetColId === 'termine') {
    setIsApprovalOpen(true);
}
if (targetColId === 'in_progress') {
    // ...
} else {
    updateTicketStatus(); // ← s'exécute AUSSI quand termine !
}

// ✅ CORRECT — chaîne exclusive
if (targetColId === 'termine') {
    setIsApprovalOpen(true);
} else if (targetColId === 'in_progress') {
    // ...
} else {
    updateTicketStatus(); // ne s'exécute QUE si les deux ci-dessus sont faux
}
```

> **Règle** : si deux conditions sont mutuellement exclusives → `else if`, jamais deux `if` séparés.

---

### ❌ 5. Utiliser une variable non définie

```js
// ❌ FAUX — ReferenceError au runtime
await fetch(`${SPRING_API}/superCout`); // SPRING_API non défini !

// ✅ CORRECT — déclarer en haut du fichier
const SPRING_API = '/api';
```

---

### ❌ 6. Appeler une fonction avec un mauvais nom

```js
// ❌ FAUX — createCostOuverture n'existe nulle part
await createCostOuverture(ticketId, ...);

// ✅ CORRECT — vérifier l'export dans le fichier service
import { createOuvertureCost } from '../../services/ouvertureCout';
await createOuvertureCost(ticketId, ...);
```

> **Règle** : toujours vérifier le nom exact de la fonction dans le fichier source avant de l'importer.

---

### ❌ 7. Guard logique bloquant inutilement une fonction

```js
// ❌ FAUX — refusalReason n'existe pas dans ce formulaire → toujours vide
const handleReouverture = async (e) => {
    if (!refusalReason.trim()) return; // ← bloque systématiquement !
    // ... le reste ne s'exécute jamais
};

// ✅ CORRECT — valider le bon champ
const handleReouverture = async (e) => {
    const pct = parseFloat(percentage);
    if (isNaN(pct) || pct <= 0) {
        alert('Pourcentage invalide');
        return;
    }
    // ... continue
};
```

---

### ❌ 8. Réinitialiser le mauvais state dans un callback

```jsx
// ❌ FAUX — approvalFormId n'est pas réinitialisé → la modale ne se rouvre pas
<TicketApprovalFormModal
    onClose={() => {
        setIsApprovalFormOpen(false);
        setApprovalTicketId(null); // ← mauvais state !
    }}
/>

// ✅ CORRECT
<TicketApprovalFormModal
    onClose={() => {
        setIsApprovalFormOpen(false);
        setApprovalFormId(null); // ← state correspondant à cette modale
    }}
/>
```

---

### ❌ 9. Appeler le mauvais endpoint dans un service

```js
// ❌ FAUX dans ouvertureCout.js — appelle superCout au lieu de ouvertureCost
export async function getOuvertureCosts() {
    const res = await fetch(`${SPRING_API}/superCout`); // ← mauvaise table !
}

// ✅ CORRECT
export async function getOuvertureCosts() {
    const res = await fetch(`${SPRING_API}/ouvertureCost`); // ← bonne table
}
```

> **Résultat de cette erreur** : deux cartes de stats affichaient 200€ chacune car elles lisaient les mêmes données.

---

## 🌐 CORS / URLs — Erreurs Fréquentes

### ❌ 10. Utiliser une URL absolue au lieu d'une URL relative (Vite Proxy)

```js
// ❌ FAUX — URL absolue = 2 origines différentes = CORS bloqué
const SPRING_API = 'http://localhost:8081/api';
fetch(`${SPRING_API}/superCout`); // bloqué par le navigateur

// ✅ CORRECT — URL relative = passe par le proxy Vite = pas de CORS
const SPRING_API = '/api';
fetch(`${SPRING_API}/superCout`); // Vite proxifie vers localhost:8081
```

> **Règle** : si `vite.config.js` a un proxy configuré pour `/api`, toujours utiliser des URLs relatives `/api/...`.

```js
// vite.config.js — proxy déjà configuré
proxy: {
    '/api': { target: 'http://localhost:8081', changeOrigin: true }
}
```

---

## ☕ SPRING BOOT — Erreurs Fréquentes

### ❌ 11. `@CrossOrigin` incomplet (pas de preflight OPTIONS)

```java
// ❌ FAUX — ne gère pas les requêtes preflight OPTIONS du navigateur
@CrossOrigin(origins = "http://localhost:5173")

// ✅ CORRECT
@CrossOrigin(
    origins = "http://localhost:5173",
    allowedHeaders = "*",
    methods = { RequestMethod.GET, RequestMethod.POST,
                RequestMethod.DELETE, RequestMethod.OPTIONS }
)
```

> **Meilleure solution** : créer une classe `CorsConfig.java` globale plutôt que `@CrossOrigin` par controller.

```java
@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*");
    }
}
```

---

### ❌ 12. Confondre `id` (clé SQLite) et `idTicket` (ID GLPI)

```java
// ❌ FAUX — supprime par la clé primaire SQLite, pas par le ticket GLPI
@DeleteMapping("/superCout/{id}")
public void delete(@PathVariable Long id) {
    repository.deleteById(id); // id = 1, 2, 3... (SQLite interne)
}

// ✅ CORRECT — ajouter un endpoint par idTicket
@DeleteMapping("/superCout/byTicket/{idTicket}")
public ResponseEntity<Void> deleteByTicket(@PathVariable Long idTicket) {
    Optional<SuperCout> result = repository.findByIdTicket(idTicket);
    if (result.isPresent()) {
        repository.delete(result.get());
        return ResponseEntity.ok().build();
    }
    return ResponseEntity.notFound().build();
}
```

> Et dans le Repository, ajouter :
```java
Optional<SuperCout> findByIdTicket(Long idTicket);
```

---

### ❌ 13. Appeler un endpoint qui n'existe pas (405 Method Not Allowed)

```
GET /api/superCout/1983  → 405 Method Not Allowed
```

Le **405** signifie que la route existe mais que la **méthode HTTP** n'est pas définie sur ce path.  
Ici, seul `DELETE /superCout/{id}` existait — pas de `GET /superCout/{id}`.

**Toujours vérifier** que ton controller a le bon `@GetMapping`, `@PostMapping`, `@DeleteMapping`.

---

## 🧠 Règles Générales à Mémoriser

| Situation | Bonne pratique |
|---|---|
| Appel d'une fonction dans `onClick` | Toujours avec `()` : `onClick={() => maFonction()}` |
| Réponse `fetch()` | Toujours `await res.json()` après vérification `res.ok` |
| State React après `setState` | Ne pas lire immédiatement — utiliser `dataTransfer` ou callback `prev =>` |
| Deux conditions mutuellement exclusives | `if / else if / else`, jamais deux `if` séparés |
| URL vers Spring Boot depuis React | URL relative `/api/...` si proxy Vite configuré |
| Import d'une fonction | Vérifier le nom exact dans le fichier source |
| Endpoint Spring Boot | Distinguer `id` (SQLite interne) et `idTicket` (ID métier GLPI) |
| CORS Spring Boot | Classe `CorsConfig` globale > `@CrossOrigin` par controller |
| Plusieurs tables SQLite similaires | Vérifier que chaque service appelle **son propre endpoint** |

---

## ✅ Checklist avant de soumettre du code

- [ ] Tous les imports sont présents et les noms sont corrects
- [ ] Les fonctions dans `onClick` ont des `()`
- [ ] Chaque `fetch()` est suivi de `.json()`
- [ ] Les `if` mutuellement exclusifs utilisent `else if`
- [ ] Les URLs vers le backend sont relatives (`/api/...`)
- [ ] Les states réinitialisés dans les callbacks correspondent à la bonne modale
- [ ] Les endpoints Spring Boot sont distincts (`byTicket` vs `id`)
- [ ] La config CORS couvre les méthodes `OPTIONS`
- [ ] Chaque service appelle bien **son propre** endpoint (pas celui d'une autre table)
