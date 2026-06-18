# Dictionnaire Complet & Explications des Requêtes SQLite (Spécial Examen)

Ce guide regroupe toutes les requêtes SQL (SQLite) utilisées, planifiées ou modifiées dans le cadre de l'application **Deskflow** (React/Spring Boot/SQLite). Il détaille la structure des tables, les requêtes DDL (création) et DML (consultation, insertion, suppression, agrégation), ainsi que des explications techniques pour chaque cas.

---

## 📋 Table des Matières
1. [Gestion des Coûts (`couts`)](#1-gestion-des-coûts-couts)
2. [Historique des Statuts de Ticket (`ticket_status_histories`)](#2-historique-des-statuts-de-ticket-ticket_status_histories)
3. [Support de Langue & Traductions (`translations`)](#3-support-de-langue--traductions-translations)
4. [Couleurs de Statuts UI (`colors`)](#4-couleurs-de-statuts-ui-colors)
5. [Gestion des Utilisateurs Locaux (`users`)](#5-gestion-des-utilisateurs-locaux-users)
6. [Système de Favoris (`favorite_tickets`)](#6-système-de-favoris-favorite_tickets)
7. [Assignations Automatiques par Catégorie (`category_assignments`)](#7-assignations-automatiques-par-catégorie-category_assignments)
8. [Notes Techniques Privées (`private_notes`)](#8-notes-techniques-privées-private_notes)
9. [Requêtes Système, Optimisation & Maintenance](#9-requêtes-système-optimisation--maintenance)

---

## 1. Gestion des Coûts (`couts`)

### Rôle Métier
La table `couts` centralise l'ensemble des données financières locales calculées. Elle remplace l'ancienne approche multi-tables en unifiant les coûts de réouverture, les coûts de passage au statut résolu (Supercoûts), les coûts GLPI, et les transactions d'annulation. 

### Structure de la Table (DDL)
```sql
CREATE TABLE IF NOT EXISTS couts (
    id_auto   INTEGER PRIMARY KEY AUTOINCREMENT,
    id_ticket INTEGER NOT NULL,
    type_cout TEXT NOT NULL,    -- 'Supercout' | 'reouverture' | 'glpi' | 'annulation'
    cout      REAL NOT NULL,     -- Montant (positif ou négatif pour annulation)
    id_item   INTEGER,           -- ID de l'équipement lié (matériel)
    category  TEXT,              -- Type ou catégorie de l'équipement (ex: 'Computer')
    grp       INTEGER NOT NULL   -- Timestamp millisecondes (utilisé comme clé de lot/groupe)
);
```

### Requêtes SQL DML

#### A. Insérer un enregistrement de coût (Simple ou Proratisé par lot)
```sql
INSERT INTO couts (id_ticket, type_cout, cout, id_item, category, grp)
VALUES (?, ?, ?, ?, ?, ?);
```
*   **Explication :** Cette requête persiste une ligne. Lors d'un calcul proratisé (ex: diviser un coût global de $150 entre 3 équipements liés à un même ticket), on insère 3 lignes partageant la **même valeur `grp`** (timestamp milliseconde généré côté frontend) et ayant chacune `cout = 50.0`.

#### B. Récupérer l'intégralité des coûts enregistrés
```sql
SELECT * FROM couts;
```

#### C. Récupérer tous les coûts associés à un ticket GLPI
```sql
SELECT * FROM couts WHERE id_ticket = ?;
```
*   **Explication :** Utilisé pour lister ou consolider tous les événements financiers (réouvertures, supercoûts, annulations) ayant affecté un ticket spécifique.

#### D. Récupérer le dernier lot/groupe d'enregistrements insérés (Clé du calcul proratisé)
```sql
SELECT * FROM couts 
WHERE id_ticket = :idTicket 
  AND type_cout = :typeCout 
  AND grp = (
      SELECT MAX(grp) 
      FROM couts 
      WHERE id_ticket = :idTicket 
        AND type_cout = :typeCout
  );
```
*   **Explication :** Cette requête utilise une sous-requête corrélée avec la fonction d'agrégation `MAX(grp)` pour cibler uniquement les lignes de l'action la plus récente. C'est crucial car, en cas d'items multiples, plusieurs lignes possèdent la même valeur `grp` (le lot).

#### E. Obtenir le timestamp du dernier groupe
```sql
SELECT MAX(grp) FROM couts 
WHERE id_ticket = :idTicket 
  AND type_cout = :typeCout;
```

#### F. Somme brute globale des Supercoûts (Ignorant les annulations)
```sql
SELECT SUM(cout) AS total_supercout 
FROM couts 
WHERE type_cout = 'Supercout';
```
*   **Explication :** Permet de voir le total brut historique dépensé en supercoûts sans prendre en compte les retours en arrière (annulations).

#### G. Somme nette globale des Supercoûts (Soustraire les annulations)
```sql
SELECT SUM(cout) AS total_net_supercout 
FROM couts 
WHERE type_cout IN ('Supercout', 'annulation');
```
*   **Explication :** Étant donné que les annulations sont stockées avec un coût négatif (ex: `-50.0`), la fonction `SUM` intègre naturellement la soustraction, ce qui fournit le coût net réel actuel.

#### H. Supprimer le dernier groupe de coûts (Annuler/Rollback)
```sql
DELETE FROM couts 
WHERE id_ticket = :idTicket 
  AND type_cout = :typeCout 
  AND grp = (
      SELECT MAX(grp) 
      FROM couts 
      WHERE id_ticket = :idTicket 
        AND type_cout = :typeCout
  );
```
*   **Explication :** Supprime physiquement toutes les lignes liées à la dernière action pour ce ticket et ce type de coût. C'est la méthode de suppression de lot la plus propre.

---

## 2. Historique des Statuts de Ticket (`ticket_status_histories`)

### Rôle Métier
Garde une trace historique d'audit de chaque changement de statut d'un ticket (méthode de *Dual-Write* : modification effectuée dans GLPI via API REST puis journalisée dans SQLite).

### Structure de la Table (DDL)
```sql
CREATE TABLE IF NOT EXISTS ticket_status_histories (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id   INTEGER NOT NULL,
    old_status  TEXT NOT NULL,
    new_status  TEXT NOT NULL,
    changed_by  TEXT DEFAULT 'admin',
    change_date TEXT NOT NULL -- Date stockée sous format ISO-8601 (Ex: '2026-06-12 09:15:40')
);
```

### Requêtes SQL DML

#### A. Insérer une ligne de log d'historique
```sql
INSERT INTO ticket_status_histories (ticket_id, old_status, new_status, changed_by, change_date)
VALUES (?, ?, ?, ?, ?);
```

#### B. Récupérer l'historique complet d'un ticket du plus récent au plus ancien
```sql
SELECT * FROM ticket_status_histories 
WHERE ticket_id = ? 
ORDER BY change_date DESC;
```
*   **Explication :** Trie les transitions de statuts par ordre chronologique inverse pour alimenter un composant d'UI de type Timeline verticale.

---

## 3. Support de Langue & Traductions (`translations`)

### Rôle Métier
Permet d'ajouter localement de nouvelles langues (comme le Malgache ou l'Anglais) pour traduire les statuts des tickets et d'autres libellés de l'interface, sans impacter la base GLPI d'origine.

### Structure de la Table (DDL)
```sql
CREATE TABLE IF NOT EXISTS translations (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    lang_code       TEXT NOT NULL,          -- ex: 'fr', 'mg'
    translation_key TEXT NOT NULL,          -- ex: 'nouveau', 'in_progress', 'termine'
    value           TEXT NOT NULL,          -- ex: 'Vaovao' (traduction)
    UNIQUE(lang_code, translation_key)
);
```

### Requêtes SQL DML

#### A. Insérer ou mettre à jour une traduction par défaut
```sql
INSERT OR IGNORE INTO translations (lang_code, translation_key, value)
VALUES ('mg', 'in_progress', 'An-dalana');
```
*   **Explication :** `INSERT OR IGNORE` permet de réensemencer (seed) la base de données sans lever d'erreurs en cas de doublons sur la contrainte d'unicité composite.

#### B. Récupérer toutes les traductions pour une langue donnée
```sql
SELECT * FROM translations WHERE lang_code = ?;
```

#### C. Récupérer une traduction spécifique
```sql
SELECT value FROM translations 
WHERE lang_code = ? AND translation_key = ?;
```

---

## 4. Couleurs de Statuts UI (`colors`)

### Rôle Métier
Stocke la palette de couleurs dynamique à appliquer aux étiquettes (badges) des statuts des tickets dans le Kanban et le BackOffice.

### Structure de la Table (DDL)
```sql
CREATE TABLE IF NOT EXISTS colors (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    color       TEXT NOT NULL,          -- ex: '#22c55e'
    status      TEXT UNIQUE NOT NULL,   -- ex: 'nouveau'
    translation TEXT                    -- Traduction par défaut optionnelle
);
```

### Requêtes SQL DML

#### A. Insérer une couleur associée à un statut
```sql
INSERT OR IGNORE INTO colors (color, status, translation)
VALUES ('#f97316', 'in_progress', 'Efa manao');
```

#### B. Récupérer la couleur d'un statut spécifique
```sql
SELECT color FROM colors WHERE status = ?;
```

---

## 5. Gestion des Utilisateurs Locaux (`users`)

### Rôle Métier
Stocker les informations d'authentification locales pour sécuriser l'accès à l'application frontend Deskflow (indépendant des utilisateurs GLPI).

### Structure de la Table (DDL)
```sql
CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role     TEXT DEFAULT 'user' -- 'user' | 'admin'
);
```

### Requêtes SQL DML

#### A. Ajouter un compte utilisateur
```sql
INSERT OR IGNORE INTO users (username, password, role)
VALUES ('shania', 'motDePasse123', 'user');
```

#### B. Rechercher un utilisateur par identifiant (Connexion)
```sql
SELECT id, username, password, role FROM users WHERE username = ?;
```
*   **Explication :** Cette requête permet de charger l'utilisateur et de comparer ensuite son mot de passe pour autoriser ou refuser l'accès.

---

## 6. Système de Favoris (`favorite_tickets`)

### Rôle Métier
Permet à chaque utilisateur connecté de marquer un ticket GLPI comme "Favori" (bookmark) pour le retrouver plus facilement. La relation est purement stockée dans SQLite local.

### Structure de la Table (DDL)
```sql
CREATE TABLE IF NOT EXISTS favorite_tickets (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT NOT NULL,
    ticket_id INTEGER NOT NULL,
    UNIQUE(username, ticket_id) -- Empêche un doublon de favori
);
```

### Requêtes SQL DML

#### A. Marquer un ticket comme favori
```sql
INSERT OR IGNORE INTO favorite_tickets (username, ticket_id)
VALUES (?, ?);
```

#### B. Récupérer tous les favoris d'un utilisateur
```sql
SELECT * FROM favorite_tickets WHERE username = ?;
```

#### C. Retirer un favori
```sql
DELETE FROM favorite_tickets WHERE username = ? AND ticket_id = ?;
```

---

## 7. Assignations Automatiques par Catégorie (`category_assignments`)

### Rôle Métier
Définit des règles métiers : à chaque catégorie de ticket GLPI correspond un technicien responsable par défaut. Lors de la création d'un ticket, SQLite fournit l'ID du technicien à assigner automatiquement.

### Structure de la Table (DDL)
```sql
CREATE TABLE IF NOT EXISTS category_assignments (
    category_id     INTEGER PRIMARY KEY, -- ID unique GLPI de la catégorie
    category_name   TEXT,
    technician_id   INTEGER NOT NULL,    -- ID du technicien GLPI à assigner
    technician_name TEXT
);
```

### Requêtes SQL DML

#### A. Enregistrer ou mettre à jour une règle d'assignation
```sql
INSERT OR REPLACE INTO category_assignments (category_id, category_name, technician_id, technician_name)
VALUES (?, ?, ?, ?);
```
*   **Explication :** `INSERT OR REPLACE` écrase la configuration existante si la clé primaire (`category_id`) existe déjà, évitant ainsi de devoir faire un test de présence d'abord.

#### B. Récupérer le technicien assigné à une catégorie
```sql
SELECT technician_id, technician_name FROM category_assignments 
WHERE category_id = ?;
```

---

## 8. Notes Techniques Privées (`private_notes`)

### Rôle Métier
Permet aux techniciens d'ajouter des notes internes et confidentielles sur les tickets. Ces notes restent exclusivement stockées dans SQLite local et ne transitent jamais sur l'API publique GLPI.

### Structure de la Table (DDL)
```sql
CREATE TABLE IF NOT EXISTS private_notes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id    INTEGER NOT NULL,
    note_content TEXT NOT NULL,
    author       TEXT DEFAULT 'admin',
    created_at   TEXT NOT NULL
);
```

### Requêtes SQL DML

#### A. Ajouter une note technique privée
```sql
INSERT INTO private_notes (ticket_id, note_content, author, created_at)
VALUES (?, ?, ?, ?);
```

#### B. Récupérer toutes les notes privées d'un ticket
```sql
SELECT * FROM private_notes 
WHERE ticket_id = ? 
ORDER BY created_at DESC;
```
*   **Explication :** Trie par date de création descendante pour afficher les notes privées de la plus récente à la plus ancienne.

---

## 9. Requêtes Système, Optimisation & Maintenance

Ces requêtes sont exécutées par les utilitaires système d'administration de la base SQLite.

#### A. Réinitialiser les compteurs d'auto-incrémentation (Reset Usine)
```sql
DELETE FROM sqlite_sequence WHERE name IN ('translations', 'colors', 'app_users');
```
*   **Explication :** En SQLite, les valeurs de clés primaires auto-incrémentées sont suivies dans la table interne `sqlite_sequence`. Supprimer l'enregistrement correspondant remet à zéro l'auto-incrémentation pour la table ciblée (par exemple pour recommencer l'ID à 1 après avoir vidé une table lors d'un réensemencement).

#### B. Optimiser l'espace disque et défragmenter la base
```sql
VACUUM;
```
*   **Explication :** Recrée le fichier de base de données en éliminant les espaces vides laissés par les suppressions massives, ce qui réduit la taille physique du fichier `deskflow` sur le disque.

#### C. Activer le support des Clés Étrangères
```sql
PRAGMA foreign_keys = ON;
```
*   **Explication :** Par défaut, SQLite n'applique pas les contraintes de clés étrangères (FK) pour des raisons de compatibilité ascendante. Cette commande doit être exécutée après chaque ouverture de connexion si vous avez des clés étrangères strictes.

#### D. Afficher le schéma physique d'une table (Via SQLite CLI)
```sql
.schema couts
```
*   **Explication :** Commande CLI de SQLite permettant d'afficher l'instruction de création d'une table pour en auditer la structure.
