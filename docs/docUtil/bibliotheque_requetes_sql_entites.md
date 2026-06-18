# 📊 Bibliothèque de Requêtes SQL SQLite par Entité (Examen)

Ce guide regroupe l'intégralité des requêtes SQL pour **toutes les entités (tables) de la base de données SQLite**. Pour chaque table, vous trouverez les requêtes de base (`SELECT *`, `INSERT`, `UPDATE`, `DELETE`), ainsi que des requêtes avancées de statistiques et d'agrégation (`SUM`, `COUNT`, `AVG`, `GROUP BY`, `HAVING`).

---

## 📋 Table des Matières
1. [Table `couts` (Gestion Financière)](#1-table-couts-gestion-financière)
2. [Table `ticket_status_histories` (Timeline des Statuts)](#2-table-ticket_status_histories-timeline-des-statuts)
3. [Table `translations` (Traductions de Langues)](#3-table-translations-traductions-de-langues)
4. [Table `colors` (Couleurs des Statuts UI)](#4-table-colors-couleurs-des-statuts-ui)
5. [Table `app_users` (Utilisateurs et Comptes Locaux)](#5-table-app_users-utilisateurs-et-comptes-locaux)
6. [Table `favorite_tickets` (Tickets Favoris)](#6-table-favorite_tickets-tickets-favoris)
7. [Table `private_notes` (Notes Techniques Privées)](#7-table-private_notes-notes-techniques-privées)
8. [Table `category_assignments` (Assignation Automatique)](#8-table-category_assignments-assignation-automatique)

---

## 1. Table `couts` (Gestion Financière)

### ⚙️ Création (DDL)
```sql
CREATE TABLE IF NOT EXISTS couts (
    id_auto   INTEGER PRIMARY KEY AUTOINCREMENT,
    id_ticket INTEGER NOT NULL,
    type_cout TEXT NOT NULL,    -- 'Supercout' | 'reouverture' | 'glpi' | 'annulation'
    cout      REAL NOT NULL,     -- Montant (négatif pour les annulations)
    id_item   INTEGER,           -- Identifiant matériel
    category  TEXT,              -- Priorité ou catégorie
    grp       INTEGER NOT NULL   -- Timestamp en millisecondes
);
```

### 🔍 Requêtes de Consultation & Filtrage (DML)
*   **Sélectionner toutes les lignes (tout historique) :**
    ```sql
    SELECT * FROM couts;
    ```
*   **Sélectionner les coûts pour un ticket précis :**
    ```sql
    SELECT * FROM couts WHERE id_ticket = 1045;
    ```
*   **Trouver le coût d'un type précis (ex: Supercoûts uniquement) :**
    ```sql
    SELECT * FROM couts WHERE type_cout = 'Supercout';
    ```
*   **Trouver le dernier lot de coût inséré pour un ticket (par grp maximum) :**
    ```sql
    SELECT * FROM couts 
    WHERE id_ticket = 1045 AND type_cout = 'Supercout' 
      AND grp = (SELECT MAX(grp) FROM couts WHERE id_ticket = 1045 AND type_cout = 'Supercout');
    ```

### ➕ Écritures & Suppressions
*   **Insérer un nouveau coût (simple ou proratisé) :**
    ```sql
    INSERT INTO couts (id_ticket, type_cout, cout, id_item, category, grp) 
    VALUES (1045, 'Supercout', 150.0, 12, 'Computer', 1718428800000);
    ```
*   **Annuler/Supprimer le dernier lot inséré :**
    ```sql
    DELETE FROM couts 
    WHERE id_ticket = 1045 AND type_cout = 'Supercout' 
      AND grp = (SELECT MAX(grp) FROM couts WHERE id_ticket = 1045 AND type_cout = 'Supercout');
    ```
*   **Mettre à jour un coût spécifique par son ID :**
    ```sql
    UPDATE couts SET cout = 120.0 WHERE id_auto = 5;
    ```

### 📈 Agrégations, Calculs & Groupements (`SUM`, `COUNT`, `GROUP BY`)
*   **Coût Total de Possession (TCO) par équipement :**
    ```sql
    SELECT SUM(cout) AS total_tco FROM couts WHERE id_item = 12;
    ```
*   **Nombre total d'interventions par équipement :**
    ```sql
    SELECT COUNT(*) AS total_interventions FROM couts WHERE id_item = 12;
    ```
*   **Somme nette de tous les coûts résolus (Supercoût net = Supercoût + annulation) :**
    ```sql
    SELECT SUM(cout) AS total_net FROM couts WHERE type_cout IN ('Supercout', 'annulation');
    ```
*   **Coût total accumulé par équipement (TCO) classé par ordre décroissant :**
    ```sql
    SELECT id_item, SUM(cout) AS total_maint 
    FROM couts 
    WHERE id_item IS NOT NULL 
    GROUP BY id_item 
    ORDER BY total_maint DESC;
    ```
*   **Nombre de tickets et coûts de maintenance regroupés par catégorie (priorité) :**
    ```sql
    SELECT category, COUNT(DISTINCT id_ticket) AS total_tickets, SUM(cout) AS total_cost 
    FROM couts 
    GROUP BY category;
    ```
*   **Identifier les équipements dont le coût total dépasse un budget critique (filtrage après groupement) :**
    ```sql
    SELECT id_item, SUM(cout) AS total_maint 
    FROM couts 
    GROUP BY id_item 
    HAVING total_maint > 500.0; -- Affiche uniquement les matériels ayant coûté plus de 500 €
    ```
*   **Pertes opérationnelles regroupées par mois chronologique :**
    ```sql
    SELECT strftime('%Y-%m', datetime(grp / 1000, 'unixepoch')) AS mois, SUM(cout) AS total_pertes 
    FROM couts 
    GROUP BY mois 
    ORDER BY mois ASC;
    ```

---

## 2. Table `ticket_status_histories` (Timeline des Statuts)

### ⚙️ Création (DDL)
```sql
CREATE TABLE IF NOT EXISTS ticket_status_histories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id   INTEGER NOT NULL,
    old_status  TEXT NOT NULL,
    new_status  TEXT NOT NULL,
    changed_by  TEXT DEFAULT 'admin',
    change_date TEXT NOT NULL -- Format ISO-8601 (ex: '2026-06-15 08:30:00')
);
```

### 🔍 Requêtes de Consultation & Filtrage (DML)
*   **Sélectionner tout l'historique de statut globale :**
    ```sql
    SELECT * FROM ticket_status_histories;
    ```
*   **Récupérer la timeline d'un ticket (de l'action la plus récente à la plus ancienne) :**
    ```sql
    SELECT * FROM ticket_status_histories 
    WHERE ticket_id = 1045 
    ORDER BY change_date DESC;
    ```

### ➕ Écritures & Suppressions
*   **Insérer une transition de statut (avec date système locale SQLite) :**
    ```sql
    INSERT INTO ticket_status_histories (ticket_id, old_status, new_status, changed_by, change_date) 
    VALUES (1045, 'New', 'Processing (assigned)', 'technicien_rojo', datetime('now', 'localtime'));
    ```
*   **Vider l'historique d'un ticket spécifique :**
    ```sql
    DELETE FROM ticket_status_histories WHERE ticket_id = 1045;
    ```

### 📈 Agrégations & Groupements (`COUNT`, `GROUP BY`)
*   **Nombre de transitions effectuées par chaque technicien (classement d'activité) :**
    ```sql
    SELECT changed_by, COUNT(*) AS nb_actions 
    FROM ticket_status_histories 
    GROUP BY changed_by 
    ORDER BY nb_actions DESC;
    ```
*   **Trouver le nombre de fois qu'un ticket a été réouvert (retour de "Solved"/"Closed" vers un statut "En cours") :**
    ```sql
    SELECT ticket_id, COUNT(*) AS nb_reouvertures 
    FROM ticket_status_histories 
    WHERE old_status IN ('Solved', 'Closed', 'Résolu', 'Clos') 
      AND new_status NOT IN ('Solved', 'Closed', 'Résolu', 'Clos')
    GROUP BY ticket_id;
    ```

---

## 3. Table `translations` (Traductions de Langues)

### ⚙️ Création (DDL)
```sql
CREATE TABLE IF NOT EXISTS translations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    lang_code       TEXT NOT NULL,          -- ex: 'fr', 'mg', 'en'
    translation_key TEXT NOT NULL,          -- ex: 'nouveau', 'in_progress'
    value           TEXT NOT NULL,          -- ex: 'Vaovao', 'An-dalana'
    UNIQUE(lang_code, translation_key)
);
```

### 🔍 Requêtes de Consultation & Filtrage (DML)
*   **Afficher toutes les traductions stockées :**
    ```sql
    SELECT * FROM translations;
    ```
*   **Récupérer toutes les traductions pour le Malgache ('mg') :**
    ```sql
    SELECT translation_key, value FROM translations WHERE lang_code = 'mg';
    ```
*   **Rechercher la traduction précise d'une clé :**
    ```sql
    SELECT value FROM translations WHERE lang_code = 'mg' AND translation_key = 'nouveau';
    ```

### ➕ Écritures & Suppressions
*   **Ajouter une traduction en évitant les doublons (Seed sécurisé) :**
    ```sql
    INSERT OR IGNORE INTO translations (lang_code, translation_key, value) 
    VALUES ('mg', 'nouveau', 'Vaovao');
    ```
*   **Forcer la mise à jour ou insérer (Upsert) :**
    ```sql
    INSERT OR REPLACE INTO translations (lang_code, translation_key, value) 
    VALUES ('mg', 'nouveau', 'Vaovao Be');
    ```
*   **Supprimer une traduction précise :**
    ```sql
    DELETE FROM translations WHERE lang_code = 'mg' AND translation_key = 'nouveau';
    ```

### 📈 Agrégations & Groupements (`COUNT`, `GROUP BY`)
*   **Nombre de clés traduites pour chaque langue disponible :**
    ```sql
    SELECT lang_code, COUNT(*) AS nb_traductions 
    FROM translations 
    GROUP BY lang_code;
    ```

---

## 4. Table `colors` (Couleurs des Statuts UI)

### ⚙️ Création (DDL)
```sql
CREATE TABLE IF NOT EXISTS colors (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    color       TEXT NOT NULL,          -- ex: '#22c55e'
    status      TEXT UNIQUE NOT NULL,   -- ex: 'nouveau', 'termine'
    translation TEXT                    -- Traduction par défaut
);
```

### 🔍 Requêtes de Consultation & Filtrage (DML)
*   **Afficher la palette de couleur complète :**
    ```sql
    SELECT * FROM colors;
    ```
*   **Trouver le code couleur hexadécimal associé au statut 'nouveau' :**
    ```sql
    SELECT color FROM colors WHERE status = 'nouveau';
    ```

### ➕ Écritures & Suppressions
*   **Enregistrer ou remplacer (modifier) la couleur d'un statut :**
    ```sql
    INSERT OR REPLACE INTO colors (status, color, translation) 
    VALUES ('nouveau', '#ef4444', 'Vaovao');
    ```

---

## 5. Table `app_users` (Utilisateurs et Comptes Locaux)

### ⚙️ Création (DDL)
```sql
CREATE TABLE IF NOT EXISTS app_users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role     TEXT DEFAULT 'user' -- 'admin' | 'user'
);
```

### 🔍 Requêtes de Consultation & Authentification (DML)
*   **Sélectionner tous les comptes :**
    ```sql
    SELECT id, username, role FROM app_users;
    ```
*   **Vérifier les identifiants d'un utilisateur (Tentative de connexion) :**
    ```sql
    SELECT id, password, role FROM app_users WHERE username = 'admin';
    ```

### ➕ Écritures & Suppressions
*   **Ajouter un nouvel utilisateur (avec rôle admin) :**
    ```sql
    INSERT OR IGNORE INTO app_users (username, password, role) 
    VALUES ('shania', 'hash_mot_de_passe_123', 'admin');
    ```
*   **Modifier le mot de passe d'un utilisateur :**
    ```sql
    UPDATE app_users SET password = 'nouveau_password_securise' WHERE username = 'shania';
    ```
*   **Supprimer un compte utilisateur :**
    ```sql
    DELETE FROM app_users WHERE username = 'test_user';
    ```

---

## 6. Table `favorite_tickets` (Tickets Favoris)

### ⚙️ Création (DDL)
```sql
CREATE TABLE IF NOT EXISTS favorite_tickets (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT NOT NULL,
    ticket_id INTEGER NOT NULL,
    UNIQUE(username, ticket_id)
);
```

### 🔍 Requêtes de Consultation & Filtrage (DML)
*   **Récupérer tous les tickets favoris d'un utilisateur connecté :**
    ```sql
    SELECT ticket_id FROM favorite_tickets WHERE username = 'shania';
    ```
*   **Vérifier si un ticket spécifique est dans les favoris d'un utilisateur (Compte le nombre de lignes) :**
    ```sql
    SELECT COUNT(*) FROM favorite_tickets WHERE username = 'shania' AND ticket_id = 1045;
    ```

### ➕ Écritures & Suppressions
*   **Ajouter un favori (sans risque de doublon grâce à UNIQUE + IGNORE) :**
    ```sql
    INSERT OR IGNORE INTO favorite_tickets (username, ticket_id) VALUES ('shania', 1045);
    ```
*   **Retirer un ticket des favoris :**
    ```sql
    DELETE FROM favorite_tickets WHERE username = 'shania' AND ticket_id = 1045;
    ```

### 📈 Agrégations & Groupements (`COUNT`, `GROUP BY`)
*   **Classement des tickets les plus mis en favori par les utilisateurs :**
    ```sql
    SELECT ticket_id, COUNT(*) AS nb_favoris 
    FROM favorite_tickets 
    GROUP BY ticket_id 
    ORDER BY nb_favoris DESC;
    ```

---

## 7. Table `private_notes` (Notes Techniques Privées)

### ⚙️ Création (DDL)
```sql
CREATE TABLE IF NOT EXISTS private_notes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id    INTEGER NOT NULL,
    note_content TEXT NOT NULL,
    author       TEXT DEFAULT 'admin',
    created_at   TEXT NOT NULL
);
```

### 🔍 Requêtes de Consultation & Filtrage (DML)
*   **Sélectionner toutes les notes privées :**
    ```sql
    SELECT * FROM private_notes;
    ```
*   **Lister toutes les notes privées d'un ticket par date décroissante (Timeline) :**
    ```sql
    SELECT * FROM private_notes WHERE ticket_id = 1045 ORDER BY created_at DESC;
    ```

### ➕ Écritures & Suppressions
*   **Ajouter une note technique privée avec la date système locale :**
    ```sql
    INSERT INTO private_notes (ticket_id, note_content, author, created_at) 
    VALUES (1045, 'Le problème matériel nécessite le remplacement de la barrette de RAM.', 'technicien_rojo', datetime('now', 'localtime'));
    ```
*   **Supprimer une note privée spécifique :**
    ```sql
    DELETE FROM private_notes WHERE id = 3;
    ```

### 📈 Agrégations & Groupements (`COUNT`, `GROUP BY`)
*   **Nombre de notes privées rédigées par ticket :**
    ```sql
    SELECT ticket_id, COUNT(*) AS nb_notes 
    FROM private_notes 
    GROUP BY ticket_id;
    ```

---

## 8. Table `category_assignments` (Assignation Automatique)

### ⚙️ Création (DDL)
```sql
CREATE TABLE IF NOT EXISTS category_assignments (
    category_id     INTEGER PRIMARY KEY,
    category_name   TEXT,
    technician_id   INTEGER NOT NULL,
    technician_name TEXT
);
```

### 🔍 Requêtes de Consultation & Filtrage (DML)
*   **Afficher la liste complète des règles d'assignation :**
    ```sql
    SELECT * FROM category_assignments;
    ```
*   **Trouver le technicien par défaut pour une catégorie spécifique :**
    ```sql
    SELECT technician_id, technician_name FROM category_assignments WHERE category_id = 4;
    ```

### ➕ Écritures & Suppressions
*   **Définir ou modifier la règle d'une catégorie :**
    ```sql
    INSERT OR REPLACE INTO category_assignments (category_id, category_name, technician_id, technician_name) 
    VALUES (4, 'Réseaux', 42, 'Mr Rojo');
    ```
*   **Supprimer une règle d'assignation :**
    ```sql
    DELETE FROM category_assignments WHERE category_id = 4;
    ```

### 📈 Agrégations & Groupements (`COUNT`, `GROUP BY`)
*   **Nombre de catégories assignées à chaque technicien :**
    ```sql
    SELECT technician_name, COUNT(*) AS nb_categories_attribuees 
    FROM category_assignments 
    GROUP BY technician_name;
    ```
