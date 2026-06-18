# Scénarios d'évaluation — Coûts des Équipements & Super Coûts

Ce document couvre les scénarios probables d'évaluation basés sur les fonctionnalités de suivi financier développées dans l'application Deskflow.

---

## 📋 Liste des Fonctionnalités Implémentées

| Fonctionnalité | Technologie | Fichier |
|---|---|---|
| Affichage des coûts fixes GLPI par équipement | React + GLPI API | `AssetListWithPrice.jsx` |
| Affichage des super coûts de refus SQLite | React + Spring Boot | `AssetListWithPrice.jsx` |
| Calcul du coût total consolidé | React (useMemo) | `AssetListWithPrice.jsx` |
| Proratisation des coûts (ticket → N équipements) | React (useMemo) | `AssetListWithPrice.jsx` |
| Détail des coûts par ticket dans une popup | React (state) | `AssetListWithPrice.jsx` |
| Filtrage par type, localisation, recherche | React (useMemo) | `AssetListWithPrice.jsx` |
| Banière d'alerte si SQLite vide | React (condition) | `AssetListWithPrice.jsx` |
| Sauvegarde d'un super coût lors d'un refus | React + Spring Boot | `TicketApprovalModal.jsx`, `cost.js` |
| Endpoint GET /api/superCout | Spring Boot | `SuperCoutController.java` |
| Endpoint POST /api/superCout | Spring Boot | `SuperCoutController.java` |
| Correction du calcul horaire GLPI | React | `TicketDetailView.jsx`, `useTicket.js` |

---

## Scénario 1 — Afficher le coût total d'un équipement

### Contexte
Un gestionnaire souhaite connaître le coût total engagé (coût GLPI + coût de refus) pour le matériel **PC-ADM-001**.

### Étapes
1. Se connecter à l'application
2. Naviguer vers **Coûts des Éléments** (`/mes-elements-prix`)
3. Rechercher "PC-ADM-001" dans la barre de recherche
4. Lire les colonnes :
   - **Coût Fixe (GLPI)** : somme des coûts déclarés dans GLPI
   - **Super Coût (SQLite)** : coûts de refus enregistrés localement
   - **Coût Total** : leur somme

### Code clé — Calcul du coût total GLPI
```javascript
// Formule GLPI : coût_temps = taux_horaire × (durée_en_secondes / 3600)
const rawFixedCost = (ticket.unrolledLines || []).reduce((sum, line) => {
  const fixed = parseFloat(String(line.cost_fixed || 0).replace(',', '.')) || 0;
  const rate  = parseFloat(String(line.cost_time  || 0).replace(',', '.')) || 0;
  const hours = parseInt(line.actiontime || 0, 10) / 3600;
  return sum + fixed + (rate * hours);
}, 0);
```

### Résultat attendu
```
Coût Fixe (GLPI) : 159.00 €
Super Coût (SQLite) : 50.00 €
Coût Total : 209.00 €
```

---

## Scénario 2 — Proratisation des coûts entre plusieurs équipements

### Contexte
Un ticket de maintenance concerne **3 équipements** (PC-ADM-001, Monitor-01, Printer-01). Le coût total du ticket est de **300 €**. Chaque équipement doit porter **1/3 du coût**.

### Principe
> Si un ticket est lié à **X équipements**, le coût est divisé équitablement par **X**.

### Code clé — Comptage des équipements liés
```javascript
// Comptage du nombre d'éléments liés à ce ticket dans Item_Ticket
const linkCount = itemsPerTicket[ticketIdStr] || 1;

// Division du coût brut par le nombre de matériels
const fixedCost = rawFixedCost / linkCount;  // 300 / 3 = 100 €
const superCost = rawSuperCost / linkCount;
```

### Dans l'interface
Le popup de détail indique :
```
Coût divisé par 3 (équipements liés)
GLPI : 100.00 €    SQLite : 0.00 €    Part : 100.00 €
```
> Survol du montant → infobulle affichant le montant brut : `Brut: 300.00 €`

---

## Scénario 3 — Enregistrer un Super Coût lors d'un refus de clôture

### Contexte
Un utilisateur refuse la clôture d'un ticket (ex: travail non conforme) et veut enregistrer une **pénalité de refus de 75 €** dans la base SQLite locale.

### Étapes
1. Aller sur le **Kanban** (`/tickets/kanban`)
2. Glisser le ticket vers la colonne **"Terminé"**
3. Dans la modale qui s'ouvre, renseigner :
   - **Super coût** : `75`
   - **Motif de refus** : `Travail non conforme aux spécifications`
4. Cliquer **"Valider le refus"**

### Code clé — Sauvegarde dans SQLite (Frontend)
```javascript
// services/cost.js
export async function createSuperCost(idTicket, ticketName, cout) {
  await fetch('http://localhost:8081/api/superCout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idTicket: Number(idTicket),   // Java Long
      ticketName,
      cout: Number(cout)            // double
    }),
  });
}

// TicketApprovalModal.jsx — appel
await createSuperCost(ticketId, ticket?.name || '', parseFloat(formData.super_cost || 0));
```

### Code clé — Endpoint Spring Boot (Backend)
```java
// SuperCoutController.java
@PostMapping("/superCout")
public SuperCout saveCout(@RequestBody SuperCout cout) {
    return coutRepository.findByTicketName(cout.getTicketName())
        .map(existing -> {
            existing.setCout(cout.getCout());
            existing.setIdTicket(cout.getIdTicket());
            return coutRepository.save(existing);
        })
        .orElseGet(() -> coutRepository.save(cout));
}
```

---

## Scénario 4 — Récupérer tous les Super Coûts depuis SQLite

### Contexte
L'application doit récupérer la liste des coûts de refus enregistrés dans SQLite au démarrage de la page.

### Code clé — Service Frontend
```javascript
// services/cost.js
export async function getSuperCosts() {
  try {
    const res = await fetch('http://localhost:8081/api/superCout');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('Spring Boot non accessible:', err.message);
    return [];  // Jamais de crash — charge GLPI quand même
  }
}
```

### Code clé — Endpoint Spring Boot
```java
@GetMapping("/superCout")
public List<SuperCout> getAllSuperCout() {
    return coutRepository.findAll();
}
```

### Réponse JSON attendue
```json
[
  { "id": 1, "idTicket": 890, "ticketName": "Panne réseau salle A", "cout": 75.0 },
  { "id": 2, "idTicket": 891, "ticketName": "Maintenance imprimante",  "cout": 30.0 }
]
```

---

## Scénario 5 — Filtrer les équipements par type et localisation

### Contexte
Un responsable veut voir uniquement les **ordinateurs** situés en **Laboratoire IA** et leurs coûts associés.

### Étapes
1. Aller sur **Coûts des Éléments** (`/mes-elements-prix`)
2. Sélectionner **"Computer"** dans le filtre "Tous les types"
3. Sélectionner **"Laboratoire IA"** dans le filtre "Toutes les localisations"
4. Le tableau se met à jour en temps réel

### Code clé — Filtrage multi-critères
```javascript
const filteredAssets = useMemo(() => {
  const term = searchTerm.toLowerCase().trim();
  return processedAssets.filter(asset => {
    const matchesSearch = !term ||
      (asset.name || '').toLowerCase().includes(term) ||
      String(asset.id).includes(term) ||
      (asset.serial || '').toLowerCase().includes(term);

    const type = asset.itemtype || asset._itemtype;
    const matchesType = !typeFilter || type === typeFilter;

    const loc = asset.locations_id?.name || asset.locations_id || '';
    const locStr = typeof loc === 'object' ? loc.name : String(loc);
    const matchesLocation = !locationFilter || locStr === locationFilter;

    return matchesSearch && matchesType && matchesLocation;
  });
}, [processedAssets, searchTerm, typeFilter, locationFilter]);
```

---

## Scénario 6 — Correction du calcul GLPI (Taux horaire × Durée)

### Contexte
Un ticket a deux lignes de coût dans GLPI :
- Ligne 1 : `cost_fixed=109`, `cost_time=0`, `actiontime=0s`
- Ligne 2 : `cost_fixed=50`, `cost_time=8.70€/h`, `actiontime=600s (10 min)`

### Formule GLPI
```
coût_ligne = cost_fixed + (cost_time × actiontime_heures)
coût_ligne_1 = 109 + (0 × 0)     = 109.00 €
coût_ligne_2 = 50  + (8.70 × 0.1667) = 51.45 €
Total = 160.45 €
```

### Code clé — Calcul dans TicketDetailView.jsx
```javascript
const { fixedCostTotal, timeCostTotal } = useMemo(() => {
  let fixedTotal = 0, timeTotal = 0;

  // ticketCosts vient de l'API Ticket/{id}/TicketCost
  // Chaque enregistrement a son propre actiontime
  ticketCosts.forEach(cost => {
    const fixed   = parseFloat(String(cost.cost_fixed || 0).replace(',', '.')) || 0;
    const rate    = parseFloat(String(cost.cost_time  || 0).replace(',', '.')) || 0;
    const seconds = parseInt(String(cost.actiontime   || 0), 10) || 0;

    fixedTotal += fixed;
    timeTotal  += rate * (seconds / 3600);  // ← formule GLPI correcte
  });

  return { fixedCostTotal: fixedTotal, timeCostTotal: timeTotal };
}, [ticketCosts]);
```

> [!IMPORTANT]
> **Erreur classique** : utiliser `cost_time` (le taux horaire) directement comme montant → résultat gonflé.
> **Correct** : `cost_time × (actiontime_secondes ÷ 3600)`.

---

## Scénario 7 — Afficher un avertissement si SQLite est vide

### Contexte
Si aucun super coût n'a encore été créé (aucun ticket refusé), afficher une bannière explicative.

### Code clé
```jsx
{superCosts.length === 0 && (
  <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-start gap-3">
    <span className="text-amber-500 text-lg">⚠️</span>
    <div>
      <p className="text-sm font-semibold text-amber-800">
        Aucun super coût enregistré dans SQLite
      </p>
      <p className="text-xs text-amber-700 mt-0.5">
        Glissez un ticket vers "Terminé" dans le Kanban pour en créer un.
      </p>
    </div>
  </div>
)}
```

---

## 🗺️ Architecture du Flux Financier

```
Kanban (glisser → Terminé)
        │
        ▼
TicketApprovalModal
  ├── Saisir Super Coût (€)
  └── createSuperCost(idTicket, name, cout)
              │
              ▼
   POST /api/superCout  [Spring Boot]
              │
              ▼
       Table superCout [SQLite]
              │
              ▼
   GET /api/superCout  [Spring Boot]
              │
              ▼
   AssetListWithPrice.jsx
   ├── getSuperCosts()
   ├── fetchAllRest('Item_Ticket')  [GLPI API]
   ├── useAssets()                 [GLPI API]
   └── useTickets() → TicketCost   [GLPI API]
              │
              ▼
   Affichage : FixedCost | SuperCost | Total
               (divisé par nb d'équipements liés)
```
