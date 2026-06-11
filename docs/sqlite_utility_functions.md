# Guide des Fonctions Utilitaires SQLite pour Spring Boot

Ce document regroupe des scénarios pratiques et des fonctions utilitaires pour interagir avec la base de données SQLite de l'application. SQLite étant une base de données fichier (ici stockée dans le fichier `deskflow` à la racine du sous-dossier `sqlite`), nous pouvons tirer parti de sa légèreté pour implémenter des fonctionnalités de réinitialisation, de sauvegarde/restauration à chaud et d'exécution de requêtes natives.

---

## Scénario 1 : Réinitialisation et Réensemencement Dynamique (Reset & Seed)

### Objectif
Exposer un point d'accès API (Endpoint) qui permet de vider toutes les tables de la base de données (Utilisateurs, Couleurs, Traductions) et de restaurer le jeu de données par défaut. Utile pour les phases de tests ou pour faire une démonstration à l'évaluateur.

### Fichiers à modifier / créer

1. **[Nouveau]** Créer le contrôleur REST `DatabaseResetController.java` dans le package `com.eval.sqlite.controller` :
   - Path complet : `sqlite/src/main/java/com/eval/sqlite/controller/DatabaseResetController.java`

### Implémentation du code Java

Créez le fichier avec le contenu suivant :

```java
package com.eval.sqlite.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import com.eval.sqlite.model.Translation;
import com.eval.sqlite.model.Color;
import com.eval.sqlite.model.AppUser;
import com.eval.sqlite.repository.TranslationRepository;
import com.eval.sqlite.repository.ColorRepository;
import com.eval.sqlite.repository.AppUserRepository;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/db")
public class DatabaseResetController {

    @Autowired
    private TranslationRepository translationRepository;

    @Autowired
    private ColorRepository colorRepository;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @PostMapping("/reset")
    public Map<String, Object> resetDatabase() {
        Map<String, Object> response = new HashMap<>();
        try {
            // 1. Vider les tables via JPA
            translationRepository.deleteAll();
            colorRepository.deleteAll();
            userRepository.deleteAll();

            // 2. Remettre à zéro les compteurs d'auto-incrémentation SQLite
            jdbcTemplate.execute("DELETE FROM sqlite_sequence WHERE name IN ('translations', 'colors', 'app_users')");

            // 3. Réensemencer les traductions par défaut
            translationRepository.saveAll(Arrays.asList(
                // Français
                new Translation("fr", "nouveau", "Nouveau"),
                new Translation("fr", "in_progress", "En cours"),
                new Translation("fr", "termine", "Terminé"),
                new Translation("fr", "en_attente", "En Attente"),
                new Translation("fr", "assignes", "Assignés"),
                
                // Malagasy
                new Translation("mg", "nouveau", "Vaovao"),
                new Translation("mg", "in_progress", "An-dalana"),
                new Translation("mg", "termine", "Vita"),
                new Translation("mg", "en_attente", "Miandry")
            ));

            // 4. Réensemencer les couleurs par défaut
            colorRepository.saveAll(Arrays.asList(
                new Color("#22c55e", "nouveau", "Vaovao"),
                new Color("#f97316", "in_progress", "Efa manao"),
                new Color("#ef4444", "termine", "Vita")
            ));

            // 5. Réensemencer un utilisateur par défaut
            AppUser defaultUser = new AppUser();
            defaultUser.setUsername("admin");
            defaultUser.setPassword("admin123"); // Idéalement haché
            userRepository.save(defaultUser);

            response.put("success", true);
            response.put("message", "Base de données réinitialisée et réensemencée avec succès.");
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return response;
    }
}
```

### Comment l'appeler depuis le Frontend
Faire une requête HTTP `POST` sur `http://localhost:8081/api/db/reset`.

---

## Scénario 2 : Sauvegarde (Backup) et Restauration Physique du Fichier SQLite

### Objectif
SQLite stockant toutes ses données dans un unique fichier physique nommé `deskflow`, la méthode la plus rapide et fiable pour faire un backup ou restaurer l'état est de copier ce fichier.

### Fichiers à modifier / créer

1. **[Nouveau]** Créer le contrôleur `DatabaseBackupController.java` :
   - Path complet : `sqlite/src/main/java/com/eval/sqlite/controller/DatabaseBackupController.java`

### Implémentation du code Java

```java
package com.eval.sqlite.controller;

import org.springframework.web.bind.annotation.*;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/db/backup")
public class DatabaseBackupController {

    private final String DB_FILE_PATH = "deskflow"; // Nom du fichier SQLite défini dans application.properties
    private final String BACKUP_FILE_PATH = "deskflow.bak";

    @PostMapping("/create")
    public Map<String, Object> createBackup() {
        Map<String, Object> response = new HashMap<>();
        File dbFile = new File(DB_FILE_PATH);
        File backupFile = new File(BACKUP_FILE_PATH);

        if (!dbFile.exists()) {
            response.put("success", false);
            response.put("message", "Le fichier de base de données n'existe pas encore à l'emplacement : " + dbFile.getAbsolutePath());
            return response;
        }

        try {
            // Copie physique à chaud du fichier SQLite
            Files.copy(dbFile.toPath(), backupFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            response.put("success", true);
            response.put("message", "Sauvegarde créée avec succès sous " + backupFile.getName());
            response.put("sizeBytes", backupFile.length());
        } catch (IOException e) {
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return response;
    }

    @PostMapping("/restore")
    public Map<String, Object> restoreBackup() {
        Map<String, Object> response = new HashMap<>();
        File dbFile = new File(DB_FILE_PATH);
        File backupFile = new File(BACKUP_FILE_PATH);

        if (!backupFile.exists()) {
            response.put("success", false);
            response.put("message", "Aucun fichier de sauvegarde trouvé sous " + backupFile.getAbsolutePath());
            return response;
        }

        try {
            // Restauration du fichier
            Files.copy(backupFile.toPath(), dbFile.toPath(), StandardCopyOption.REPLACE_EXISTING);
            response.put("success", true);
            response.put("message", "Restauration effectuée avec succès depuis " + backupFile.getName());
        } catch (IOException e) {
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return response;
    }
}
```

---

## Scénario 3 : Console de requêtes SQL Natives (Lecture seule de sécurité)

### Objectif
Permettre à un administrateur d'exécuter des requêtes de type `SELECT` brutes sur SQLite via un Endpoint sécurisé (pour vérifier le schéma, inspecter la table `sqlite_master` ou compter des lignes sans repasser par JPA).

### Fichiers à modifier / créer

1. **[Nouveau]** Créer le contrôleur `DatabaseQueryController.java` :
   - Path complet : `sqlite/src/main/java/com/eval/sqlite/controller/DatabaseQueryController.java`

### Implémentation du code Java

```java
package com.eval.sqlite.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.core.JdbcTemplate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/db/query")
public class DatabaseQueryController {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * Exécute une requête SQL SELECT brute fournie en paramètre.
     * Pour des raisons de sécurité évidentes, la requête doit commencer par 'SELECT'.
     */
    @PostMapping
    public Map<String, Object> executeQuery(@RequestBody Map<String, String> payload) {
        Map<String, Object> response = new HashMap<>();
        String sql = payload.get("sql");

        if (sql == null || sql.trim().isEmpty()) {
            response.put("success", false);
            response.put("error", "La requête SQL ne peut pas être vide.");
            return response;
        }

        // Vérification de sécurité élémentaire : Lecture seule
        String cleanSql = sql.trim().toUpperCase();
        if (!cleanSql.startsWith("SELECT") && !cleanSql.startsWith("PRAGMA")) {
            response.put("success", false);
            response.put("error", "Seules les requêtes SELECT et PRAGMA sont autorisées via cet endpoint pour des raisons de sécurité.");
            return response;
        }

        try {
            List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
            response.put("success", true);
            response.put("results", rows);
            response.put("rowCount", rows.size());
        } catch (Exception e) {
            response.put("success", false);
            response.put("error", e.getMessage());
        }
        return response;
    }
}
```

### Exemple de corps de requête HTTP POST
```json
{
  "sql": "SELECT name FROM sqlite_master WHERE type='table'"
}
```
Cette requête renvoie la liste de toutes les tables créées dans votre base SQLite.
