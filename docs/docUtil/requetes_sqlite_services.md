# 🛠️ Requêtes SQL Utiles pour les Services SQLite (Spring Boot & React)

Ce guide regroupe les requêtes SQL et JPQL indispensables à intégrer dans vos repositories et services **Spring Boot** (Java) ou dans vos scripts d'accès aux bases de données locales **SQLite**. Il est structuré par fonctionnalité métier pour vous servir de fiche de référence rapide pour le développement et les examens.

---

## 📋 Table des Matières
1. [Intégration SQL dans Spring Boot (JPA vs Native vs JdbcTemplate)](#1-intégration-sql-dans-spring-boot-jpa-vs-native-vs-jdbctemplate)
2. [Gestion des Coûts & Indicateurs Financiers (`couts`)](#2-gestion-des-coûts--indicateurs-financiers-couts)
3. [Historique des Statuts de Ticket (`ticket_status_histories`)](#3-historique-des-statuts-de-ticket-ticket_status_histories)
4. [Support de Langues & Traductions (`translations`)](#4-support-de-langues--traductions-translations)
5. [Couleurs de Statuts UI (`colors`)](#5-couleurs-de-statuts-ui-colors)
6. [Système de Favoris (`favorite_tickets`)](#6-système-de-favoris-favorite_tickets)
7. [Notes Techniques Privées (`private_notes`)](#7-notes-techniques-privées-private_notes)
8. [Assignations Automatiques par Catégorie (`category_assignments`)](#8-assignations-automatiques-par-catégorie-category_assignments)
9. [Requêtes Système & Maintenance SQLite](#9-requêtes-système--maintenance-sqlite)

---

## 1. Intégration SQL dans Spring Boot (JPA vs Native vs JdbcTemplate)

Pour intégrer ces requêtes dans vos services Spring Boot, vous disposez de trois approches principales :

### A. JPQL (Java Persistence Query Language)
Utilisé pour les requêtes orientées objet sur des entités JPA.
```java
@Query("SELECT c FROM Cout c WHERE c.idTicket = :idTicket")
List<Cout> findByTicketId(@Param("idTicket") Long idTicket);
```

### B. SQL Natif (Spécifique SQLite)
Nécessaire pour les fonctions SQLite particulières (ex: `MAX`, `SUM`, ou sous-requêtes complexes).
```java
@Query(value = "SELECT * FROM couts WHERE grp = (SELECT MAX(grp) FROM couts)", nativeQuery = true)
List<Cout> findLatestGroupNative();
```

### C. JdbcTemplate (Opérations système et dynamiques)
Idéal pour exécuter des scripts de nettoyage, des requêtes DDL dynamiques ou des utilitaires système.
```java
@Autowired
private JdbcTemplate jdbcTemplate;

public void resetAutoIncrement() {
    jdbcTemplate.execute("DELETE FROM sqlite_sequence WHERE name = 'couts'");
}
```

---

## 2. Gestion des Coûts & Indicateurs Financiers (`couts`)

La table `couts` regroupe tous les mouvements financiers associés aux équipements (`idItem`) et aux tickets (`idTicket`).

```sql
-- Structure DDL de référence
CREATE TABLE IF NOT EXISTS couts (
    id_auto   INTEGER PRIMARY KEY AUTOINCREMENT,
    id_ticket INTEGER NOT NULL,
    type_cout TEXT NOT NULL,    -- 'Supercout' | 'reouverture' | 'glpi' | 'annulation'
    cout      REAL NOT NULL,
    id_item   INTEGER,
    category  TEXT,
    grp       INTEGER NOT NULL   -- Timestamp en ms pour regrouper les écritures d'un lot
);
```

### 📈 Requêtes de Logique Métier

#### A. Coût Total de Possession (TCO) d'un Équipement (Asset TCO)
Calcule la somme de tous les coûts de maintenance accumulés pour un matériel donné.
```java
// Dans CoutRepository.java
@Query("SELECT SUM(c.cout) FROM Cout c WHERE c.idItem = :idItem")
Double calculateTcoByItem(@Param("idItem") Long idItem);
```
> [!TIP]
> Si la valeur renvoyée est `null`, convertissez-la en `0.0` dans votre classe de service.

#### B. Somme Nette des Coûts (Prise en compte des annulations négatives)
Obtient le montant financier net en ajoutant les coûts positifs et en déduisant automatiquement les transactions d'annulation (stockées avec un signe moins `-`).
```java
// Dans CoutRepository.java
@Query("SELECT SUM(c.cout) FROM Cout c WHERE c.typeCout IN ('Supercout', 'annulation')")
Double calculateNetSupercouts();
```

#### C. Récupérer le Dernier Lot de Coûts Insérés (Proratisation par transaction)
Permet de récupérer les lignes du dernier événement de coût (ex: l'ensemble des matériels proratisés lors d'une résolution).
```java
// Dans CoutRepository.java
@Query("SELECT c FROM Cout c WHERE c.idTicket = :idTicket AND c.typeCout = :typeCout AND c.grp = (SELECT MAX(c2.grp) FROM Cout c2 WHERE c2.idTicket = :idTicket AND c2.typeCout = :typeCout)")
List<Cout> findLatestGroup(
    @Param("idTicket") Long idTicket,
    @Param("typeCout") String typeCout
);
```

#### D. Annulation/Rollback du Dernier Groupe de Coûts
Supprime le dernier lot inséré pour un ticket et un type donnés.
```java
// Dans CoutRepository.java
@Modifying
@Transactional
@Query("DELETE FROM Cout c WHERE c.idTicket = :idTicket AND c.typeCout = :typeCout AND c.grp = (SELECT MAX(c2.grp) FROM Cout c2 WHERE c2.idTicket = :idTicket AND c2.typeCout = :typeCout)")
void deleteLatestGroup(
    @Param("idTicket") Long idTicket,
    @Param("typeCout") String typeCout
);
```

#### E. Alerte d'Équipement Hors-Budget (ROI / Remplacement)
Identifie les matériels dont le coût total de maintenance dépasse un certain budget maximum.
```java
// Requête SQL native pour trouver les matériels en dépassement
@Query(value = "SELECT id_item, SUM(cout) AS total_maint FROM couts GROUP BY id_item HAVING total_maint > :budgetLimit", nativeQuery = true)
List<Object[]> findItemsExceedingBudget(@Param("budgetLimit") double budgetLimit);
```

---

## 3. Historique des Statuts de Ticket (`ticket_status_histories`)

Permet de suivre le cycle de vie du ticket pour générer une timeline ou auditer les temps de résolution.

### 📈 Requêtes de Logique Métier

#### A. Insérer une transition de statut
```java
// SQL natif via JdbcTemplate ou save() standard via JpaRepository
@Query(value = "INSERT INTO ticket_status_histories (ticket_id, old_status, new_status, changed_by, change_date) VALUES (:ticketId, :oldStatus, :newStatus, :changedBy, datetime('now', 'localtime'))", nativeQuery = true)
@Modifying
@Transactional
void logStatusTransition(
    @Param("ticketId") Long ticketId,
    @Param("oldStatus") String oldStatus,
    @Param("newStatus") String newStatus,
    @Param("changedBy") String changedBy
);
```

#### B. Récupérer l'historique chronologique pour la Timeline UI
```java
// Dans TicketStatusHistoryRepository.java
@Query("SELECT h FROM TicketStatusHistory h WHERE h.ticketId = :ticketId ORDER BY h.changeDate DESC")
List<TicketStatusHistory> getTimeline(@Param("ticketId") Long ticketId);
```

#### C. Temps moyen passé par statut (Calcul de performance)
Aide à identifier dans quel statut les tickets restent bloqués le plus longtemps (nécessite que `change_date` soit au format standard UNIX epoch ou ISO-8601 parsable).
```sql
-- Exemple de requête SQL SQLite pour calculer la durée brute en secondes entre les étapes
SELECT 
    t1.ticket_id,
    t1.new_status AS status,
    strftime('%s', t2.change_date) - strftime('%s', t1.change_date) AS seconds_in_status
FROM ticket_status_histories t1
JOIN ticket_status_histories t2 
  ON t1.ticket_id = t2.ticket_id 
 AND t2.id = t1.id + 1;
```

---

## 4. Support de Langues & Traductions (`translations`)

Permet d'internationaliser dynamiquement l'application (par exemple pour afficher l'interface en Malgache ou en Français).

### 📈 Requêtes de Logique Métier

#### A. Insertion sécurisée ou réensemencement (Seed)
Évite de dupliquer des clés de traduction lors de la réinitialisation de la base de données.
```sql
-- SQLite SQL natif
INSERT OR IGNORE INTO translations (lang_code, translation_key, value) 
VALUES ('mg', 'in_progress', 'An-dalana');
```

#### B. Récupérer le dictionnaire complet pour une langue
Charge les clés et valeurs sous forme de Map pour le frontend (React).
```java
// Dans TranslationRepository.java
@Query("SELECT t.translationKey, t.value FROM Translation t WHERE t.langCode = :langCode")
List<Object[]> findDictionaryByLangCode(@Param("langCode") String langCode);
```

---

## 5. Couleurs de Statuts UI (`colors`)

Stocke la configuration visuelle des étiquettes de statut de l'interface.

### 📈 Requêtes de Logique Métier

#### A. Sauvegarder ou Mettre à jour une couleur de statut (Save or Update)
```sql
-- Utilise INSERT OR REPLACE pour mettre à jour la couleur si le statut existe déjà
INSERT OR REPLACE INTO colors (status, color, translation) 
VALUES (:status, :color, :translation);
```

#### B. Récupérer le code couleur hexadécimal associé à un statut
```java
// Dans ColorRepository.java
@Query("SELECT c.color FROM Color c WHERE c.status = :status")
String findColorByStatus(@Param("status") String status);
```

---

## 6. Système de Favoris (`favorite_tickets`)

Permet aux utilisateurs de marquer et filtrer leurs tickets favoris.

```sql
CREATE TABLE IF NOT EXISTS favorite_tickets (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    username  TEXT NOT NULL,
    ticket_id INTEGER NOT NULL,
    UNIQUE(username, ticket_id)
);
```

### 📈 Requêtes de Logique Métier

#### A. Ajouter aux favoris sans risque de doublon
```java
@Modifying
@Transactional
@Query(value = "INSERT OR IGNORE INTO favorite_tickets (username, ticket_id) VALUES (:username, :ticketId)", nativeQuery = true)
void addFavorite(@Param("username") String username, @Param("ticketId") Long ticketId);
```

#### B. Vérifier si un ticket est en favori pour un utilisateur
```java
@Query("SELECT COUNT(f) > 0 FROM FavoriteTicket f WHERE f.username = :username AND f.ticketId = :ticketId")
boolean isFavorite(@Param("username") String username, @Param("ticketId") Long ticketId);
```

---

## 7. Notes Techniques Privées (`private_notes`)

Stocke les annotations des techniciens qui ne doivent pas remonter sur l'API publique GLPI.

```sql
CREATE TABLE IF NOT EXISTS private_notes (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id    INTEGER NOT NULL,
    note_content TEXT NOT NULL,
    author       TEXT DEFAULT 'admin',
    created_at   TEXT NOT NULL
);
```

### 📈 Requêtes de Logique Métier

#### A. Ajouter une note privée avec horodatage automatique
```java
@Modifying
@Transactional
@Query(value = "INSERT INTO private_notes (ticket_id, note_content, author, created_at) VALUES (:ticketId, :content, :author, datetime('now', 'localtime'))", nativeQuery = true)
void addPrivateNote(
    @Param("ticketId") Long ticketId, 
    @Param("content") String content, 
    @Param("author") String author
);
```

#### B. Lister toutes les notes d'un ticket (de la plus récente à la plus ancienne)
```java
@Query("SELECT n FROM PrivateNote n WHERE n.ticketId = :ticketId ORDER BY n.createdAt DESC")
List<PrivateNote> getNotesByTicket(@Param("ticketId") Long ticketId);
```

---

## 8. Assignations Automatiques par Catégorie (`category_assignments`)

Permet d'assigner automatiquement un technicien GLPI à la création d'un ticket selon sa catégorie.

```sql
CREATE TABLE IF NOT EXISTS category_assignments (
    category_id     INTEGER PRIMARY KEY,
    category_name   TEXT,
    technician_id   INTEGER NOT NULL,
    technician_name TEXT
);
```

### 📈 Requêtes de Logique Métier

#### A. Définir ou Modifier une règle d'assignation
```sql
INSERT OR REPLACE INTO category_assignments (category_id, category_name, technician_id, technician_name) 
VALUES (:categoryId, :categoryName, :technicianId, :technicianName);
```

#### B. Trouver l'assignation par défaut pour une catégorie donnée
```java
@Query("SELECT a.technicianId FROM CategoryAssignment a WHERE a.categoryId = :categoryId")
Long findTechnicianIdByCategoryId(@Param("categoryId") Long categoryId);
```

---

## 9. Requêtes Système & Maintenance SQLite

Ces requêtes sont indispensables pour la construction d'endpoints d'administration de bases de données dans vos contrôleurs (ex: `DatabaseResetController.java`).

### ⚙️ Commandes Utilitaires

#### A. Remise à zéro des compteurs d'auto-incrémentation
Lorsque vous videz une table (`DELETE FROM table`), SQLite conserve le dernier ID attribué. Pour recommencer à `1`, il faut vider la table interne `sqlite_sequence` :
```java
// Dans un service utilisant JdbcTemplate
public void resetAllSequences() {
    jdbcTemplate.execute("DELETE FROM sqlite_sequence WHERE name IN ('translations', 'colors', 'couts', 'private_notes')");
}
```

#### B. Activer le support des Clés Étrangères (Foreign Keys)
Par défaut, SQLite ne valide pas les contraintes de clés étrangères. Il faut exécuter cette requête à l'ouverture de chaque connexion ou via la configuration Spring Boot :
```sql
PRAGMA foreign_keys = ON;
```

#### C. Nettoyage physique et libération de l'espace disque
Après une suppression massive de données, le fichier SQLite ne rétrécit pas sur le disque. Utilisez `VACUUM` pour reconstruire la base de données de manière optimisée :
```java
public void defragmentDatabase() {
    jdbcTemplate.execute("VACUUM");
}
```

#### D. Vérification de l'intégrité de la base de données
Exécute une vérification structurelle complète du fichier SQLite. Si tout est correct, la requête renvoie le texte `ok`.
```java
public String checkIntegrity() {
    return jdbcTemplate.queryForObject("PRAGMA integrity_check", String.class);
}
```
