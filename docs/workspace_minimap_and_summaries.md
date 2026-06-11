# Cartographie du Projet et Résumé des Guides de Préparation (Minimap)

Ce document sert de **guide d'orientation central (Minimap)** pour vous repérer rapidement dans la structure du projet GLPI Deskflow (React & Spring Boot/SQLite) et retrouver immédiatement le guide `.md` correspondant à chaque cas d'usage pour l'évaluation.

---

## 1. Minimap de la Structure Globale du Projet

```text
glpi/
│
├── docs/                                    <-- TOUS LES GUIDES ET PROCÉDURES (Fichiers .md)
│   ├── sqlite_utility_functions.md          <-- Backup, Reset & Seed, Requêtes SQL natives dans Spring Boot
│   ├── scenarios_probables_evaluation.md    <-- Auth simple, configuration d'alertes SLA, traducteur fallback React
│   ├── ticket_approval_workflow.md          <-- Processus de validation lors de la fermeture d'un ticket sur le Kanban
│   ├── ticket_kanban_multiple_selection.md  <-- Drag & Drop et modification groupée de plusieurs tickets
│   ├── ticket_costs_calculation.md          <-- Formules de calcul des coûts fixes et des coûts de temps
│   ├── financial_metrics_guide.md           <-- Rentabilité générale, marges, bénéfices, TCO
│   ├── ticket_history_guide.md              <-- Historique des tâches, suivis et solutions (Fil du ticket)
│   ├── utility_functions_guide.md           <-- Formateurs de dates, de durées et de devises
│   └── ... (voir détails en Section 2)
│
├── deskflow/                                <-- FRONTEND REACT (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── templates/
│   │   │   │   ├── Kanban.jsx               <-- Composant Kanban réutilisable (Colonnes et Cartes)
│   │   │   │   └── Modal.jsx, Button.jsx...
│   │   │   └── ticket/
│   │   │       ├── TicketKanban.jsx         <-- Tableau Kanban principal des Tickets
│   │   │       ├── TicketFiche.jsx          <-- Fiche de détails d'un ticket (Fil, Éléments, Stats)
│   │   │       └── TicketApprovalModal.jsx   <-- [Optionnel] Pop-up de confirmation de clôture
│   │   ├── hooks/
│   │   │   └── useTicket.js                 <-- Hook de chargement et dégroupement (unrolledLines) des tickets
│   │   ├── utils/
│   │   │   └── ticketHelper.js              <-- Fonctions d'appels API pour les statuts et formulaires
│   │   └── App.jsx                          <-- Configuration des routes (Kanban, Dashboard, Login)
│
└── sqlite/                                  <-- BACKEND SPRING BOOT (SQLite)
    ├── src/main/java/com/eval/sqlite/
    │   ├── model/
    │   │   ├── AppUser.java                 <-- Table des utilisateurs (app_users)
    │   │   ├── Color.java                   <-- Table des couleurs de statuts (colors)
    │   │   └── Translation.java             <-- Table des traductions de statuts (translations)
    │   ├── repository/
    │   │   └── ...Repository.java           <-- Accès JPA à SQLite (ColorRepository, etc.)
    │   ├── controller/
    │   │   ├── ColorController.java         <-- API de modification des couleurs
    │   │   ├── TranslationController.java   <-- API des traductions
    │   │   └── AppUserController.java        <-- API de gestion des utilisateurs
    │   └── SqliteApplication.java           <-- Point d'entrée & Initialisation/Seeding au démarrage
    └── src/main/resources/
        └── application.properties           <-- Config SQLite (`jdbc:sqlite:deskflow`)
```

---

## 2. Index et Résumé de Chaque Fichier de la Documentation (`docs/`)

Voici un résumé par catégorie de chaque fichier `.md` présent dans le dossier `docs` pour savoir lequel ouvrir selon la question de l'évaluateur.

### 📁 Thème A : Kanban & Interaction Utilisateur

| Fichier Guide | Résumé de la Fonctionnalité Décrite | Fichiers du Code Concernés |
| :--- | :--- | :--- |
| [ticket_kanban_multiple_selection.md](file:///d:/shania/itu/L3/glpi/docs/ticket_kanban_multiple_selection.md) | Permet de sélectionner plusieurs tickets sur le Kanban via des cases à cocher pour les déplacer ou mettre à jour leur statut en lot (Drag & Drop multiple + barre d'actions groupées). | `Kanban.jsx`, `TicketKanban.jsx`, `ticketHelper.js` |
| [ticket_approval_workflow.md](file:///d:/shania/itu/L3/glpi/docs/ticket_approval_workflow.md) | Intercepte le passage d'un ticket en statut **Terminé** sur le Kanban pour ouvrir une fiche d'approbation. Si approuvé -> statut 6. Si refusé -> demande de motif, création d'un suivi de refus et retour au statut 2 (En cours). | `TicketKanban.jsx`, `TicketApprovalModal.jsx` (Nouveau) |
| [ticket_duplication_guide.md](file:///d:/shania/itu/L3/glpi/docs/ticket_duplication_guide.md) | Explique comment implémenter un bouton permettant de dupliquer un ticket existant et ses tâches associées. | `TicketDetailView.jsx`, `ticketHelper.js` |
| [ticket_filtering_guide.md](file:///d:/shania/itu/L3/glpi/docs/ticket_filtering_guide.md) | Guide pour implémenter des filtres de recherche multi-critères (par statut, urgence, demandeur) sur la liste des tickets. | `TicketList.jsx` ou `TicketKanban.jsx` |
| [TODO-mes-tickets.md](file:///d:/shania/itu/L3/glpi/docs/TODO-mes-tickets.md) | Fiche de tâches pour restreindre l'affichage des tickets uniquement à ceux qui sont assignés au technicien connecté. | `useTicket.js`, `TicketKanban.jsx` |

---

### 📁 Thème B : Calculs Financiers, TCO & Statistiques

| Fichier Guide | Résumé de la Fonctionnalité Décrite | Fichiers du Code Concernés |
| :--- | :--- | :--- |
| [ticket_costs_calculation.md](file:///d:/shania/itu/L3/glpi/docs/ticket_costs_calculation.md) | Fonction utilitaire pour calculer le Coût Fixe (`cost_fixed`), le Coût lié au temps (`actiontime` en heures $\times$ `cost_time` en taux horaire) et le Coût Total par ticket. Contient une fonction console et un tableau React. | `ticketHelper.js`, Composants UI |
| [financial_metrics_guide.md](file:///d:/shania/itu/L3/glpi/docs/financial_metrics_guide.md) | Calculs de rentabilité d'un ticket : comparaison entre budget alloué et coût de résolution réel pour dégager les bénéfices, les pertes et le taux de marge. | Utilitaires de calcul financier |
| [business_logic_metrics_functions.md](file:///d:/shania/itu/L3/glpi/docs/business_logic_metrics_functions.md) | Évaluation financière du TCO (Total Cost of Ownership) d'un équipement et détection automatique des matériels devenus des gouffres financiers (pertes de maintenance). | `Dashboard.jsx`, Services de stats |
| [TODO-stats-dashboard.md](file:///d:/shania/itu/L3/glpi/docs/TODO-stats-dashboard.md) | Procédure pour ajouter des cartes KPIs financiers (coût moyen par ticket, temps total accumulé) et graphiques sur le tableau de bord de l'application. | `Dashboard.jsx` |
| [most_expensive_ticket_guide.md](file:///d:/shania/itu/L3/glpi/docs/most_expensive_ticket_guide.md) | Algorithme pour identifier et afficher le ticket le plus coûteux de tout le système avec le détail de ses coûts. | `Dashboard.jsx` |

---

### 📁 Thème C : SQLite & Backend Spring Boot

| Fichier Guide | Résumé de la Fonctionnalité Décrite | Fichiers du Code Concernés |
| :--- | :--- | :--- |
| [sqlite_utility_functions.md](file:///d:/shania/itu/L3/glpi/docs/sqlite_utility_functions.md) | Utilitaires Spring Boot pour SQLite : Réinitialisation et réensemencement complet via `/api/db/reset`, copie à chaud du fichier SQLite pour sauvegarde/restauration, et exécution sécurisée de requêtes SQL brutes. | `DatabaseResetController.java`, `DatabaseBackupController.java` |
| [scenarios_probables_evaluation.md](file:///d:/shania/itu/L3/glpi/docs/scenarios_probables_evaluation.md) | Fiche récapitulative des scénarios d'examen clés à coder sans IA : création d'un système de login sans Spring Security, ajout d'une entité de configuration système dans SQLite avec Upsert, et fallback de traduction dans React. | `AppUser.java`, `AuthController.java`, `SystemConfig.java` |
| [TODO-login-sqlite.md](file:///d:/shania/itu/L3/glpi/docs/TODO-login-sqlite.md) | Roadmap complète pour le branchement de la base SQLite de Spring Boot avec le stockage de session utilisateur dans React. | `App.jsx`, `authService.js`, `Login.jsx` |

---

### 📁 Thème D : Import de Données, Historique & Validations

| Fichier Guide | Résumé de la Fonctionnalité Décrite | Fichiers du Code Concernés |
| :--- | :--- | :--- |
| [import_validation_and_rollback.md](file:///d:/shania/itu/L3/glpi/docs/import_validation_and_rollback.md) | Guide pour valider l'intégrité des fichiers d'import CSV avant leur insertion dans GLPI et mise en place d'un mécanisme d'annulation (rollback) en cas d'échec. | `importService.js` |
| [ticket_history_guide.md](file:///d:/shania/itu/L3/glpi/docs/ticket_history_guide.md) | Permet de construire une frise chronologique (Timeline) fusionnant les descriptions d'origine, les tâches techniques et les suivis ordonnés par date. | `TicketFiche.jsx`, `TicketDetailView.jsx` |
| [TODO-checkbox-zip.md](file:///d:/shania/itu/L3/glpi/docs/TODO-checkbox-zip.md) | Permet de gérer le téléversement et le dézippage de fichiers CSV contenant des indicateurs d'activation de champs (cases à cocher dans l'import). | Services d'import, `Import.jsx` |
| [utility_functions_guide.md](file:///d:/shania/itu/L3/glpi/docs/utility_functions_guide.md) | Fonctions de formatage génériques indispensables (convertir les secondes en format textuel "2h 30min", etc.). | Fichiers utilitaires du frontend |

---

### 📁 Thème E : Fiches de Révision Rapide (Cheatsheets d'Examen)

| Fichier Guide | Résumé de la Fonctionnalité Décrite | Fichiers du Code Concernés |
| :--- | :--- | :--- |
| [react_cheat_sheet.md](file:///d:/shania/itu/L3/glpi/docs/react_cheat_sheet.md) | Aide-mémoire React complet : inputs contrôlés, hooks `useEffect`/`useMemo`, requêtes POST/PUT/DELETE, et communication Enfant ➔ Parent (callbacks). | Composants React généraux |
| [sqlite_springboot_cheat_sheet.md](file:///d:/shania/itu/L3/glpi/docs/sqlite_springboot_cheat_sheet.md) | Aide-mémoire Spring Boot & SQLite (JPA) : déclarer une Entité, requêtes Repository natives, API REST avec CORS, seeding de données, et `JdbcTemplate`. | Modèles et contrôleurs Java |
| [calcul_total_et_filtrage.md](file:///d:/shania/itu/L3/glpi/docs/calcul_total_et_filtrage.md) | Concept de cascade réactive en React pour filtrer une liste d'éléments puis en calculer la somme cumulée de façon synchronisée et fluide. | Composants de listes et Dashboard |
