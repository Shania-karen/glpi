# Choix du Mode d'Importation : CSV vs Manuel

Ce document explique le fonctionnement et la répartition des composants selon le mode d'importation choisi lors de l'intégration des mouvements et coûts financiers dans la base SQLite locale.

---

## 1. Vue d'Ensemble

L'application Deskflow propose deux modes d'importation pour gérer les mouvements financiers (Clôture/Supercout, Réouverture, Annulation) et leur impact sur GLPI et SQLite :

```mermaid
graph TD
    Choix{Mode d'importation}
    Choix -->|Saisie manuelle| Manuel[Composant ImportForm]
    Choix -->|Fichier CSV| CSV[Composant ImportSqlite]
    
    Manuel -->|Route: /importForm| RouteManuel[/importForm]
    CSV -->|Route: /backoffice/importSqlite| RouteCSV[/backoffice/importSqlite]
    
    RouteManuel --> Service[coutWorkflowService.js]
    RouteCSV --> Service
```

---

## 2. Mode Manuel : Composant `ImportForm.jsx`

Si l'utilisateur souhaite importer un mouvement manuellement (un par un), l'application affiche le formulaire de saisie manuelle.

*   **Composant associé** : `src/components/backoffice/ImportForm.jsx`
*   **Route associée** : `/importForm`
*   **Fonctionnement** :
    1.  L'utilisateur saisit la référence du ticket (champ `ID Ticket` qui correspond en réalité à la référence externe `externalid` du ticket importé).
    2.  L'utilisateur choisit le type de mouvement (*Clôture*, *Réouverture*, *Annulation*) et saisit la valeur associée (montant ou pourcentage).
    3.  Le composant récupère en arrière-plan la liste des tickets GLPI pour faire correspondre la référence externe avec le véritable identifiant interne (`id`) de la base GLPI.
    4.  Il appelle ensuite les méthodes centralisées de `coutWorkflowService.js` (par exemple `closeTicketWithCosts`) avec ce véritable identifiant.

---

## 3. Mode Fichier CSV : Composant `ImportSqlite.jsx`

Si l'utilisateur possède un fichier d'import complet (plusieurs lignes sous format CSV), l'application affiche l'interface d'importation par lot.

*   **Composant associé** : `src/pages/backoffice/ImportSqlite.jsx`
*   **Route associée** : `/backoffice/importSqlite`
*   **Fonctionnement** :
    1.  L'interface propose une zone de glisser-déposer (`DropZone`) acceptant un fichier `.csv`.
    2.  Le fichier CSV doit contenir les colonnes : `ticket` (référence externe), `mvt` (type de mouvement) et `valeur`.
    3.  Au clic sur "Lancer l'import", le service `services/importSqlite.js` effectue un traitement par lot.
    4.  Pour chaque ligne du CSV, il recherche le ticket GLPI correspondant à l'identifiant externe (`externalid`), récupère le `id` de base de données de GLPI, puis délègue le traitement aux méthodes de `coutWorkflowService.js`.
    5.  **Sécurité (Tout ou Rien)** : Si une ligne du CSV échoue (par exemple, un ticket inexistant ou une mauvaise valeur), toutes les écritures SQLite de la session sont annulées automatiquement (Rollback).

---

## 4. Logique Métier Partagée

Quel que soit le mode d'importation choisi, les règles métier et les traitements appliqués sont **identiques**. Ils partagent le même fichier de workflow : `src/services/coutWorkflowService.js` :

| Action choisie | Fonction appelée dans `coutWorkflowService.js` | Statut GLPI final | Impact SQLite |
| :--- | :--- | :--- | :--- |
| **Clôture** / `termine` | `closeTicketWithCosts(ticketId, totalCost, ...)` | `6` (Clos) | Ligne(s) `Supercout` insérées (divisées par le nombre d'équipements liés au ticket). |
| **Réouverture** / `reouverture` | `reopenTicketWithCosts(ticketId, percentage, ...)` | `2` (En cours) | Ligne(s) `reouverture` insérées (valeur calculée au prorata du dernier `Supercout`). |
| **Annulation** / `annulation` | `cancelTicketCosts(ticketId, ...)` | `2` (En cours) | Ligne(s) `annulation` insérées (valeurs négatives contrebalançant le dernier `Supercout`). |
