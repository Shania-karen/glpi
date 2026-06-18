# Guide Complet : Comment Éviter les Erreurs de CORS (Spécial Examen)

Ce guide explique en détail ce qu'est le **CORS** (Cross-Origin Resource Sharing), pourquoi cette erreur se produit dans notre architecture, et comment l'éviter ou la résoudre définitivement côté **Backend (Spring Boot)** et **Frontend (Vite / React)**.

---

## 🌐 1. Qu'est-ce que le CORS ?

Le **CORS** est un mécanisme de sécurité implémenté par les navigateurs web. Il empêche une page web d'effectuer des requêtes HTTP vers un domaine (ou une origine) différent de celui qui a servi la page web d'origine.

### La notion d'Origine
Une origine est définie par le triptyque : **Protocole + Domaine + Port**.
Si l'un de ces trois éléments diffère, le navigateur considère qu'il s'agit d'une origine différente (Cross-Origin).

| Origine Source (Frontend) | Origine Cible (Backend) | Est-ce du CORS ? | Statut par défaut |
| :--- | :--- | :--- | :--- |
| `http://localhost:5173` | `http://localhost:8081` | **Oui** (Port différent : 5173 vs 8081) | **Bloqué** par le navigateur |
| `http://localhost:5173` | `http://glpi.local:8080` | **Oui** (Domaine et port différents) | **Bloqué** par le navigateur |
| `http://localhost:5173` | `http://localhost:5173` | **Non** (Même origine) | **Autorisé** |

---

## ☕ 2. Résolution côté Backend (Spring Boot)

Pour autoriser le frontend React (`http://localhost:5173`) à appeler directement le backend Spring Boot (`http://localhost:8081`), deux méthodes sont disponibles.

### Méthode A : Configuration Globale (Recommandée & Robuste)
Créez une classe de configuration dans le package `config/` (ex: `sqlite/src/main/java/com/eval/sqlite/config/CorsConfig.java`). 

> [!TIP]
> C'est la méthode idéale pour un examen car elle protège tous vos futurs contrôleurs sans avoir à y ajouter d'annotations individuelles.

```java
package com.eval.sqlite.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**") // Applique la règle à tous les endpoints commençant par /api
                .allowedOrigins("http://localhost:5173") // Autorise uniquement le frontend React
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS") // Méthodes HTTP autorisées
                .allowedHeaders("*") // Autorise tous les headers (Content-Type, Authorization, etc.)
                .allowCredentials(false) // Mettre à true si vous gérez des cookies/sessions partagés
                .maxAge(3600); // Durée en secondes du cache de preflight CORS (1 heure)
    }
}
```

### Méthode B : L'annotation `@CrossOrigin` (Locale)
Si vous ne voulez pas créer de classe de configuration globale, vous devez ajouter l'annotation `@CrossOrigin` au-dessus de **chaque contrôleur**.

> [!WARNING]
> Une annotation `@CrossOrigin` incomplète sans la méthode `OPTIONS` ou les headers autorisés peut bloquer le frontend lors de requêtes de type `POST`, `PUT` ou `DELETE` (les requêtes dites complexes déclenchent un appel "Preflight" avec le verbe `OPTIONS` envoyé au préalable par le navigateur).

```java
@RestController
@RequestMapping("/api")
@CrossOrigin(
    origins = "http://localhost:5173",
    allowedHeaders = "*",
    methods = { 
        RequestMethod.GET, 
        RequestMethod.POST, 
        RequestMethod.PUT, 
        RequestMethod.DELETE, 
        RequestMethod.OPTIONS 
    }
)
public class CoutController {
    // Vos endpoints...
}
```

---

## ⚛️ 3. Résolution côté Frontend (Vite / React Proxy)

C'est la solution la plus élégante côté client. Au lieu de forcer le navigateur à faire des requêtes directes vers le backend (ce qui déclenche la sécurité CORS), on configure le serveur de développement **Vite** pour qu'il serve de relais (Proxy). 

### Le principe de fonctionnement
```
[Navigateur]  ───Requête relative vers /api/couts───→  [Vite Dev Server (Port 5173)]
                                                              │ (Pas de restriction CORS
                                                              │  de serveur à serveur)
                                                              ▼
[Spring Boot (Port 8081)]  ←──Relais transparent───  [Vite Dev Server (Port 5173)]
```

### Étape 1 : Configuration dans `vite.config.js`
Configurez les proxies dans la section `server` du fichier de configuration Vite :

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 1. Relais pour le backend Spring Boot (SQLite)
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        // Pas besoin de réécriture car le backend Spring utilise déjà le préfixe /api
      },
      // 2. Relais pour l'API GLPI
      '/api-glpi': {
        target: 'http://glpi.local:8080', // URL réelle de GLPI
        changeOrigin: true,
        // Réécriture nécessaire si l'API GLPI n'utilise pas le préfixe /api-glpi
        rewrite: (path) => path.replace(/^\/api-glpi/, '')
      }
    }
  }
})
```

### Étape 2 : Utiliser des URLs relatives dans les services React (Règle d'or)
Une fois le proxy configuré, vous devez **impérativement** utiliser des URLs relatives.

```javascript
// ❌ FAUX : URL absolue = déclenche la sécurité CORS du navigateur
const SPRING_API = 'http://localhost:8081/api';
await fetch(`${SPRING_API}/couts`); 

// ✅ CORRECT : URL relative = passe par le proxy de Vite = AUCUN problème de CORS
const SPRING_API = '/api';
await fetch(`${SPRING_API}/couts`); 
```

---

## 🚨 Checklist d'Examen pour diagnostiquer les erreurs de CORS

Si l'interface affiche une erreur CORS dans la console de développement (F12) :

1. **Vérifier l'URL dans React** : Est-elle relative ? Si vous voyez `http://localhost:8081` ou `http://glpi.local` en dur dans les appels `fetch()`, remplacez-les par `/api` ou `/api-glpi`.
2. **Vérifier les contrôleurs Spring Boot** :
   - Est-ce qu'une classe `CorsConfig.java` existe et est annotée par `@Configuration` ?
   - Si vous utilisez `@CrossOrigin`, avez-vous inclus `RequestMethod.OPTIONS` dans les méthodes autorisées ?
3. **Vérifier le fichier `vite.config.js`** :
   - Le proxy est-il correctement configuré sous `server.proxy` ?
   - Les cibles (`target`) correspondent-elles aux bons ports (ex: `8081` pour Spring Boot, `8080` pour GLPI) ?
4. **Relancer les serveurs** : Si vous modifiez `vite.config.js`, redémarrez impérativement le serveur de développement React (`npm run dev`) pour que la configuration du proxy soit prise en compte.
