# Scénarios Probables d'Évaluation (Code sans IA)

Ce guide est conçu pour vous préparer aux questions d'évaluation les plus probables concernant le couplage **React/GLPI** et le backend **Spring Boot/SQLite**. Les codes présentés ici sont volontairement écrits de manière **simple, minimaliste et facile à mémoriser** pour être reproduits sans l'aide d'une IA en situation d'examen.

---

## Scénario 1 : Créer une API d'Authentification simple (Sans Spring Security)

L'évaluateur peut demander de sécuriser l'application avec un écran de connexion simple en validant les identifiants stockés dans la table `app_users` de SQLite. 

> [!TIP]
> N'utilisez pas Spring Security à l'examen (trop de configuration complexe). Faites une comparaison de chaînes brute directe dans un contrôleur standard.

### Étape 1 : Le Modèle JPA (`AppUser.java`)
*Fichier à créer :* `sqlite/src/main/java/com/eval/sqlite/model/AppUser.java`
```java
package com.eval.sqlite.model;

import jakarta.persistence.*;

@Entity
@Table(name = "app_users")
public class AppUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    private String password;

    // Getters et Setters (indispensables)
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
```

### Étape 2 : Le Repository (`AppUserRepository.java`)
*Fichier à créer :* `sqlite/src/main/java/com/eval/sqlite/repository/AppUserRepository.java`
```java
package com.eval.sqlite.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.eval.sqlite.model.AppUser;
import java.util.Optional;

public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByUsername(String username);
}
```

### Étape 3 : Le Contrôleur d'Authentification (`AuthController.java`)
*Fichier à créer :* `sqlite/src/main/java/com/eval/sqlite/controller/AuthController.java`
```java
package com.eval.sqlite.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.eval.sqlite.model.AppUser;
import com.eval.sqlite.repository.AppUserRepository;
import java.util.Map;
import java.util.HashMap;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private AppUserRepository userRepository;

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> credentials) {
        String username = credentials.get("username");
        String password = credentials.get("password");
        Map<String, Object> response = new HashMap<>();

        userRepository.findByUsername(username).ifPresentOrElse(user -> {
            if (user.getPassword().equals(password)) {
                response.put("success", true);
                response.put("username", user.getUsername());
                response.put("message", "Connexion réussie !");
            } else {
                response.put("success", false);
                response.put("message", "Mot de passe incorrect.");
            }
        }, () -> {
            response.put("success", false);
            response.put("message", "Utilisateur non trouvé.");
        });

        return response;
    }
}
```

---

## Scénario 2 : Ajouter une Nouvelle Entité de Configuration (ex : Seuils d'Alerte SLA)

L'évaluateur peut dire : *"Ajoutez un paramètre de configuration dans SQLite pour définir le seuil d'heures au-delà duquel un ticket est considéré hors SLA, avec un écran pour le modifier."*

### Étape 1 : L'Entité (`SystemConfig.java`)
*Fichier à créer :* `sqlite/src/main/java/com/eval/sqlite/model/SystemConfig.java`
```java
package com.eval.sqlite.model;

import jakarta.persistence.*;

@Entity
@Table(name = "system_configs")
public class SystemConfig {
    @Id
    private String configKey; // ex: "sla_threshold_hours"
    private String configValue; // ex: "24"

    public SystemConfig() {}
    public SystemConfig(String configKey, String configValue) {
        this.configKey = configKey;
        this.configValue = configValue;
    }

    public String getConfigKey() { return configKey; }
    public void setConfigKey(String configKey) { this.configKey = configKey; }
    public String getConfigValue() { return configValue; }
    public void setConfigValue(String configValue) { this.configValue = configValue; }
}
```

### Étape 2 : Le Repository (`SystemConfigRepository.java`)
*Fichier à créer :* `sqlite/src/main/java/com/eval/sqlite/repository/SystemConfigRepository.java`
```java
package com.eval.sqlite.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.eval.sqlite.model.SystemConfig;

public interface SystemConfigRepository extends JpaRepository<SystemConfig, String> {
}
```

### Étape 3 : Le Contrôleur avec Upsert (`SystemConfigController.java`)
*Fichier à créer :* `sqlite/src/main/java/com/eval/sqlite/controller/SystemConfigController.java`
```java
package com.eval.sqlite.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.eval.sqlite.model.SystemConfig;
import com.eval.sqlite.repository.SystemConfigRepository;
import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/configs")
public class SystemConfigController {

    @Autowired
    private SystemConfigRepository configRepository;

    @GetMapping
    public List<SystemConfig> getAll() {
        return configRepository.findAll();
    }

    @PostMapping
    public SystemConfig saveOrUpdate(@RequestBody SystemConfig config) {
        // Logique "Upsert" simple
        return configRepository.findById(config.getConfigKey())
            .map(existing -> {
                existing.setConfigValue(config.getConfigValue());
                return configRepository.save(existing);
            })
            .orElseGet(() -> configRepository.save(config));
    }
}
```

---

## Scénario 3 : Traduction Dynamique avec Fallback dans React (Frontend)

L'évaluateur vous demande d'afficher les statuts traduits en Malagasy s'ils existent dans SQLite, sinon d'utiliser la valeur par défaut française/anglaise de GLPI.

### Étape 1 : Le code de fallback propre dans le composant
Dans `TicketKanban.jsx`, nous avons déjà les traductions SQLite chargées. Si vous devez coder le fallback sans aide :

```javascript
// Fonction de traduction directe
const getTranslatedStatus = (statusId, dbTranslations, currentLang, defaultTitle) => {
    // Si la langue est le français, ou si on n'a pas chargé la BDD
    if (currentLang === 'fr') return defaultTitle;

    // Rechercher dans les traductions chargées depuis l'API de SQLite
    const translation = dbTranslations.find(
        t => t.lang === currentLang && t.key === statusId
    );

    // Retourner la traduction si trouvée, sinon la valeur par défaut
    return translation ? translation.value : defaultTitle;
};
```

---

## Scénario 4 : Filtrage des tickets par critères multiples en JavaScript pur

L'évaluateur demande d'ajouter un filtre sur le Kanban ou la liste des tickets (ex: filtrer par technicien assigné et par texte libre).

### Code de filtrage propre à intégrer dans le composant React :

```javascript
const filteredTickets = useMemo(() => {
  return tickets.filter(ticket => {
    // 1. Filtre Recherche textuelle (Titre ou ID)
    const matchesSearch = searchTerm 
      ? (ticket.name?.toLowerCase().includes(searchTerm.toLowerCase()) || String(ticket.id) === searchTerm)
      : true;

    // 2. Filtre par Technicien Assigné (Vérification dans l'équipe du ticket)
    const matchesTechnician = selectedTechId 
      ? ticket.team?.some(member => member.role === 'assigned' && String(member.name) === String(selectedTechId))
      : true;

    // Le ticket doit valider les deux conditions pour être affiché
    return matchesSearch && matchesTechnician;
  });
}, [tickets, searchTerm, selectedTechId]);
```

---

## Astuces pour l'Examen sans IA :

1. **JPA gère la création des tables :** Assurez-vous d'avoir `spring.jpa.hibernate.ddl-auto=update` dans votre `application.properties`. Ainsi, dès que vous lancez l'application Spring Boot, SQLite va automatiquement créer la table `system_configs` ou ajouter les colonnes manquantes.
2. **CORS :** N'oubliez jamais l'annotation `@CrossOrigin(origins = "http://localhost:5173")` au-dessus de vos nouveaux contrôleurs Spring Boot, sinon votre frontend React sera bloqué lors des appels API.
3. **Erreurs JSON :** Quand vous envoyez du JSON depuis React vers Spring Boot, veillez à ce que les clés du JSON correspondent **exactement** aux noms des attributs de votre classe Java (attention à la casse).
4. **Getters/Setters :** En Java, sans l'annotation Lombok `@Data`, vous devez écrire les getters et setters manuellement. Si vous les oubliez, Jackson ne pourra pas sérialiser/désérialiser les objets JSON, ce qui causera des erreurs HTTP 400 ou des champs `null`.
