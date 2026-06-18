# Scénarios d'Examen : Importation, Coûts et Logique Centralisée

Ce document détaille les scénarios types susceptibles de tomber à l'examen concernant l'**importation de données**, la **gestion des coûts** et la **centralisation de la logique**, avec les instructions pas à pas et le code associé pour les résoudre rapidement.

---

## 🛠️ Scénario A : Double écriture de l'Historique des Statuts (`ticket_status_histories`)

### 📋 Objectif
Enregistrer chaque changement de statut d'un ticket (qu'il soit modifié manuellement par Drag & Drop sur le Kanban ou via un import CSV de mouvements) dans la base SQLite locale pour auditer les temps de résolution.

### 📝 Ce qu'il faut faire

#### Étape 1 : Créer la fonction d'historisation centralisée
Ajoutez une fonction dans votre service centralisé (ex: `deskflow/src/services/coutWorkflowService.js` ou un helper de ticket) :

```javascript
/**
 * Enregistre une transition de statut dans SQLite
 */
export async function logStatusTransition(ticketId, oldStatus, newStatus) {
  try {
    const payload = {
      idTicket: Number(ticketId),
      oldStatus: String(oldStatus),
      newStatus: String(newStatus),
      changedAt: Date.now()
    };
    
    const res = await fetch('/api/status-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error("Erreur BDD locale lors de l'historisation");
    return await res.json();
  } catch (err) {
    console.error("Échec de l'historisation du statut :", err.message);
  }
}
```

#### Étape 2 : Centraliser le changement de statut
Définissez une fonction de transition globale dans `coutWorkflowService.js` :

```javascript
import { fetchDataAPIRest } from './apiClient';

export async function updateTicketStatusAndLog(ticketId, newStatusId, oldStatusName) {
  // 1. Appel API GLPI pour changer le statut
  await fetchDataAPIRest(`Ticket/${ticketId}`, {
    method: 'PUT',
    body: { input: { id: ticketId, status: newStatusId } }
  });

  // Mappage des IDs GLPI vers noms lisibles (optionnel)
  const statusNames = { 1: 'nouveau', 2: 'in_progress', 6: 'termine' };
  const newStatusName = statusNames[newStatusId] || 'inconnu';

  // 2. Double écriture dans SQLite
  await logStatusTransition(ticketId, oldStatusName, newStatusName);
}
```

#### Étape 3 : Brancher sur le Kanban
Dans `TicketKanban.jsx` (ou le gestionnaire de Drag & Drop) :

```javascript
// Remplacer l'appel direct à updateTicketStatus par :
await updateTicketStatusAndLog(ticketId, statusMap[targetColId], sourceColId);
```

#### Étape 4 : Brancher sur l'Import CSV
Dans `importSqlite.js` ou votre script d'import :

```javascript
// Lors de l'import d'un mouvement 'termine' :
await updateTicketStatusAndLog(ticketId, 6, 'in_progress');
```

---

## 🛠️ Scénario B : Support d'une nouvelle langue d'import (Malgache ➔ Français)

### 📋 Objectif
Permettre à l'import CSV de comprendre des fichiers rédigés en langue malgache (ex : mouvements ou statuts comme `baovao` pour Nouveau, `eo am-panatanterahana` pour En cours, `vita` pour Fermé/Terminé).

### 📝 Ce qu'il faut faire

#### Étape 1 : Définir le dictionnaire de traduction centralisé
Créez ou étendez un dictionnaire de mapping linguistique :

```javascript
const MALAGASY_STATUS_MAP = {
  'baovao': 1,               // Nouveau
  'nouveau': 1,
  'eo am-panatanterahana': 2, // En cours
  'en cours': 2,
  'vita': 6,                  // Terminé / Clos
  'termine': 6,
  'ferme': 6,
  'annule': 'cancel'
};
```

#### Étape 2 : Créer la fonction de normalisation
Ajoutez une fonction robuste qui nettoie la chaîne de caractères (suppression des accents, espaces, mise en minuscule) :

```javascript
export function normalizeAndTranslateStatus(rawStatus) {
  if (!rawStatus) return 1; // statut par défaut (Nouveau)
  
  const clean = rawStatus
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Enlever accents
    .trim();

  return MALAGASY_STATUS_MAP[clean] || 1; 
}
```

#### Étape 3 : L'appliquer dans l'import
Dans votre boucle de parsing de l'import CSV :

```javascript
const rawMvt = cleanColumns[1] || '';
const parsedStatusId = normalizeAndTranslateStatus(rawMvt);

// Vous pouvez maintenant utiliser parsedStatusId directement pour vos aiguillages métiers
```

---

## 🛠️ Scénario C : Alerte ou Blocage sur Dépassement de Budget d'Équipement (SLA)

### 📋 Objectif
Avant d'affecter un coût à un ticket (ou lors de l'import d'un coût), vérifier si le coût cumulé de maintenance de l'équipement concerné dépasse son budget alloué. Si c'est le cas, insérer une alerte en BDD SQLite ou rejeter l'opération.

### 📝 Ce qu'il faut faire

#### Étape 1 : Créer la fonction de vérification budgétaire
Ajoutez cette méthode dans `coutWorkflowService.js` :

```javascript
/**
 * Vérifie si l'ajout d'un coût dépasse le budget d'un équipement
 */
export async function verifyEquipmentBudget(itemId, category, newCostAmount) {
  if (!itemId || !category) return { alert: false };

  try {
    // 1. Récupérer le budget et les coûts accumulés de l'item depuis votre backend Spring Boot
    const res = await fetch(`/api/budget/check/${category}/${itemId}`);
    if (!res.ok) return { alert: false };
    
    const data = await res.json(); 
    // Format attendu de l'API : { budget: 1000, currentSpent: 900 }
    
    const totalWithNewCost = data.currentSpent + parseFloat(newCostAmount);
    
    if (totalWithNewCost > data.budget) {
      // Déclenchement d'une alerte en BDD
      await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemId,
          category,
          message: `Dépassement de budget : ${totalWithNewCost}€ cumulés pour un budget de ${data.budget}€`,
          timestamp: Date.now()
        })
      });
      return { alert: true, limitExceeded: true, message: "Le budget de maintenance a été dépassé !" };
    }
  } catch (err) {
    console.warn("Impossible de vérifier le budget :", err.message);
  }
  return { alert: false };
}
```

#### Étape 2 : L'intégrer dans la Clôture Métier (Kanban & Import)
Modifiez la fonction `closeTicketWithCosts` pour qu'elle valide le budget de chaque item **avant** d'insérer le coût :

```javascript
export async function closeTicketWithCosts(ticketId, totalCost, options = {}) {
  // ... (récupération des linkedItems)
  
  const coutParItem = linkedItems.length > 0 ? parseFloat((totalCost / linkedItems.length).toFixed(2)) : totalCost;

  // Validation préventive
  for (const item of linkedItems) {
    const budgetCheck = await verifyEquipmentBudget(item.items_id, item.itemtype, coutParItem);
    if (budgetCheck.limitExceeded) {
      console.warn(`[Alerte Budget] Item #${item.items_id} : ${budgetCheck.message}`);
      // Optionnel : lever une erreur pour bloquer l'importation ou la clôture si exigé
      // throw new Error(`Clôture interdite : budget dépassé sur l'équipement ${item.items_id}`);
    }
  }

  // ... (suite de l'insertion des coûts)
}
```

---

## 🛠️ Scénario D : Mécanisme de Rollback Transactionnel Multi-Entités

### 📋 Objectif
Sécuriser l'import de données. Si vous importez un fichier CSV contenant des tickets et des coûts liés, et qu'une ligne échoue (ex: ticket inexistant dans GLPI), vous devez **annuler toutes les modifications précédentes** (supprimer les tickets et les coûts insérés depuis le début de cette session d'importation).

### 📝 Ce qu'il faut faire

#### Étape 1 : Déclarer des collecteurs d'identifiants
Au début de votre fonction d'importation, créez des tableaux vides pour stocker les clés primaires de tout ce que vous créez avec succès :

```javascript
const createdTicketIds = [];
const createdCostIds = [];
```

#### Étape 2 : Alimenter les collecteurs à chaque succès
À chaque fois qu'un appel `POST` réussit, enregistrez l'ID retourné :

```javascript
// Exemple pour un ticket créé dans GLPI
const ticketRes = await createTicketInGLPI(ticketData);
if (ticketRes?.id) {
  createdTicketIds.push(ticketRes.id);
}

// Exemple pour un coût créé dans SQLite
const costRes = await createCout(costData);
if (costRes?.idAuto) {
  createdCostIds.push(costRes.idAuto);
}
```

#### Étape 3 : Structurer le bloc `catch` pour le Rollback
Si une erreur survient, bouclez à l'envers sur vos tableaux d'IDs pour envoyer des requêtes de suppression (`DELETE`) :

```javascript
try {
  // ... votre boucle d'importation ...
} catch (error) {
  console.error("Échec de l'importation. Nettoyage de la base de données (Rollback)...");

  // A. Rollback des coûts SQLite
  for (const costId of createdCostIds) {
    try {
      await fetch(`/api/couts/${costId}`, { method: 'DELETE' });
    } catch (e) {
      console.error(`Impossible de supprimer le coût ${costId} lors du rollback :`, e.message);
    }
  }

  // B. Rollback des tickets GLPI
  for (const ticketId of createdTicketIds) {
    try {
      await fetch(`/api/rest/Ticket/${ticketId}`, { method: 'DELETE' });
    } catch (e) {
      console.error(`Impossible de supprimer le ticket ${ticketId} lors du rollback :`, e.message);
    }
  }

  // Relancer l'erreur pour informer l'interface utilisateur
  throw new Error(`Importation annulée : ${error.message}. ${createdCostIds.length} coûts et ${createdTicketIds.length} tickets ont été nettoyés.`);
}
```
