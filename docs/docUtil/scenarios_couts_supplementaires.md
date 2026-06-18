# Scénarios Supplémentaires — Coûts Financiers & Gestion des Tickets

Ce fichier complète les scénarios déjà documentés avec des cas pratiques supplémentaires basés sur les fonctionnalités de suivi financier.

---

## Scénario 8 — Identifier l'équipement le plus coûteux

### Contexte
Le responsable informatique veut rapidement identifier quel matériel a engendré le plus de coûts (GLPI + Super Coûts).

### Approche
Trier le tableau par **Coût Total** décroissant et lire la première ligne.

### Code clé — Tri par coût décroissant
```javascript
// Dans AssetListWithPrice.jsx, ajouter un tri dans filteredAssets
const sortedAssets = useMemo(() => {
  return [...filteredAssets].sort((a, b) => b.grandTotalCost - a.grandTotalCost);
}, [filteredAssets]);
```

### Résultat attendu
```
Équipement       | Type     | Coût Fixe  | Super Coût | Total
PC-ADM-001       | Computer | 159.00 €   | 75.00 €    | 234.00 €  ← le plus cher
Monitor-01       | Monitor  | 45.00 €    | 0.00 €     | 45.00 €
Printer-01       | Printer  | 0.00 €     | 0.00 €     | 0.00 €
```

---

## Scénario 9 — Vérifier qu'un super coût a été bien persisté

### Contexte
Après avoir refusé la clôture d'un ticket via le Kanban et saisi un super coût de 100 €, le technicien veut confirmer que la valeur est bien enregistrée dans SQLite.

### Étape 1 — Via l'API Spring Boot directement
Ouvrir dans le navigateur :
```
http://localhost:8081/api/superCout
```
Réponse attendue :
```json
[
  {
    "id": 1,
    "idTicket": 890,
    "ticketName": "Panne réseau salle A",
    "cout": 100.0
  }
]
```

### Étape 2 — Via la page AssetListWithPrice
1. Naviguer vers `/mes-elements-prix`
2. Trouver l'équipement lié au ticket `#890`
3. Vérifier que la colonne **Super Coût (SQLite)** affiche `100.00 €`
4. Vérifier que le **Coût Total** = Coût Fixe GLPI + 100.00 €

### Code clé — Matching ID ticket ↔ SuperCout SQLite
```javascript
// Correspondance par ID (prioritaire) puis par nom
const sc = superCostById[ticketIdStr] || superCostByName[ticketNameKey] || null;
const rawSuperCost = sc
  ? (parseFloat(String(sc.cout || 0).replace(',', '.')) || 0)
  : 0;
```

---

## Scénario 10 — Comprendre la proratisation sur plusieurs équipements

### Contexte
Un ticket coûte **300 € (GLPI)** et est lié à **3 équipements**.
Chaque équipement doit afficher **100 €** (= 300 ÷ 3).

### Vérification dans la console
Ouvrir la console (F12) sur la page `/mes-elements-prix` et filtrer par :
```
[AssetListWithPrice] Building superCost maps
```

### Code clé — Proratisation
```javascript
// Nombre d'équipements liés à ce ticket
const linkCount = itemsPerTicket[ticketIdStr] || 1;

// Part du coût pour CET équipement
const fixedCost = rawFixedCost / linkCount;  // 300 / 3 = 100 €
const superCost = rawSuperCost / linkCount;
```

### Résultat dans le popup de détail
```
Coût divisé par 3 (équipements liés)
GLPI : 100.00 €   SQLite : 0.00 €   Part : 100.00 €
                                    ──────────────
                                    [Survol → Brut: 300.00 €]
```

---

## Scénario 11 — Chargement résilient si Spring Boot est hors ligne

### Contexte
Le serveur Spring Boot (port 8081) est arrêté. La page doit toujours afficher les coûts GLPI, avec une bannière d'avertissement à la place des super coûts.

### Comportement attendu
- ✅ Les équipements s'affichent avec leurs coûts GLPI
- ✅ La colonne **Super Coût (SQLite)** affiche `0.00 €` ou `-`
- ✅ Une bannière orange informe que SQLite est indisponible
- ❌ Aucun crash ou page blanche

### Code clé — Chargement indépendant
```javascript
// AssetListWithPrice.jsx — useEffect
// Item_Ticket (GLPI) se charge INDÉPENDAMMENT du SQLite
const links = await fetchAllRest('Item_Ticket').catch(() => []);
setItemTickets(links);   // ← toujours mis à jour même si SQLite échoue

// SQLite se charge séparément — jamais d'exception propagée
const scList = await getSuperCosts();  // catch interne dans getSuperCosts
setSuperCosts(scList);
```

```javascript
// services/cost.js — getSuperCosts() toujours safe
export async function getSuperCosts() {
  try {
    const res = await fetch('http://localhost:8081/api/superCout');
    if (!res.ok) return [];
    return (await res.json()) || [];
  } catch (err) {
    console.warn('[getSuperCosts] Spring Boot non accessible:', err.message);
    return [];  // ← jamais de throw, toujours un tableau
  }
}
```

---

## Scénario 12 — Mise à jour d'un super coût existant (upsert)

### Contexte
Un ticket a déjà un super coût de **50 €** enregistré. Le responsable veut le corriger à **120 €**.

### Comportement de l'API
Le `POST /api/superCout` fonctionne en **upsert** : si un enregistrement existe pour ce `ticketName`, il est mis à jour ; sinon, un nouveau est créé.

### Code clé — Backend Spring Boot
```java
// SuperCoutController.java
return coutRepository.findByTicketName(cout.getTicketName())
    .map(existing -> {
        existing.setCout(cout.getCout());         // mise à jour : 50 → 120
        existing.setIdTicket(cout.getIdTicket());
        return coutRepository.save(existing);
    })
    .orElseGet(() -> coutRepository.save(cout)); // création si absent
```

### Code clé — Frontend (appel)
```javascript
// TicketApprovalModal.jsx
await createSuperCost(
  ticketId,           // Long Java
  ticket?.name || '',
  parseFloat(formData.super_cost || 0)  // 120.00
);
```

---

## Scénario 13 — Afficher le détail des coûts d'un équipement

### Contexte
Le technicien clique sur le bouton **"2 ticket(s) ▼"** pour voir quels tickets ont engendré des coûts sur le `PC-ADM-001`.

### Interface
```
Tickets associés à PC-ADM-001
┌─────────────────────────────────────────────────────────────────┐
│ #890 Panne réseau salle A                          [En cours]   │
│ Coût divisé par 2 (équipements liés)                            │
│ GLPI : 80.00 €    SQLite : 50.00 €    Part : 130.00 €          │
├─────────────────────────────────────────────────────────────────┤
│ #891 Maintenance préventive                        [Clos]       │
│ GLPI : 79.85 €    SQLite : 0.00 €     Part : 79.85 €           │
└─────────────────────────────────────────────────────────────────┘
```

### Code clé — Popup
```jsx
{isExpanded && (
  <div className="absolute z-10 w-96 bg-white border border-neutral-200 rounded-xl shadow-xl p-4">
    {asset.linkedTickets.map(ticket => (
      <div key={ticket.id}>
        {ticket.linkCount > 1 && (
          <p className="text-[9px] italic">
            Coût divisé par {ticket.linkCount} (équipements liés)
          </p>
        )}
        <span title={`Brut: ${ticket.rawFixedCost.toFixed(2)} €`}>
          GLPI : {ticket.fixedCost.toFixed(2)} €
        </span>
      </div>
    ))}
  </div>
)}
```

---

## Scénario 14 — Calcul correct du coût horaire GLPI

### Contexte
Un ticket a ce TicketCost dans GLPI :
- `cost_fixed = 50.00 €`
- `cost_time = 8.70 €/h` (taux horaire)
- `actiontime = 600 s` (10 minutes)

### Formule à appliquer
```
coût_temps = taux_horaire × (secondes ÷ 3600)
           = 8.70 × (600 ÷ 3600)
           = 8.70 × 0.1667
           = 1.45 €

coût_total_ligne = cost_fixed + coût_temps
                 = 50.00 + 1.45
                 = 51.45 €
```

> [!IMPORTANT]
> **Erreur classique** : utiliser directement `cost_time = 8.70 €` comme coût → résultat gonflé.
> **Correct** : `cost_time × (actiontime ÷ 3600)`.

### Code clé — useTicket.js
```javascript
// Chaque TicketCost a son propre actiontime (durée liée au coût)
const costActiontime = parseInt(
  String(cost.actiontime?.value || cost.actiontime || 0), 10
) || 0;

unrolledLines.push({
  ...ticket,
  actiontime: costActiontime,   // ← utilise cost.actiontime, PAS task.actiontime
  cost_fixed: costFixedVal,
  cost_time: costTimeVal
});
```

### Code clé — AssetListWithPrice.jsx
```javascript
const rawFixedCost = (ticket.unrolledLines || []).reduce((sum, line) => {
  const fixed = parseFloat(String(line.cost_fixed || 0)) || 0;
  const rate  = parseFloat(String(line.cost_time  || 0)) || 0;
  const hours = parseInt(line.actiontime || 0, 10) / 3600;
  return sum + fixed + (rate * hours);  // ← formule correcte
}, 0);
```

---

## Récapitulatif des Points Clés pour l'Évaluation

| Point | Détail |
|---|---|
| **Source des coûts fixes** | API GLPI → `Ticket/{id}/TicketCost` ou `fetchAllRest('TicketCost')` |
| **Source des super coûts** | Spring Boot SQLite → `GET http://localhost:8081/api/superCout` |
| **Formule coût horaire** | `cost_time (€/h) × (actiontime_s ÷ 3600)` |
| **Proratisation** | Coût total ÷ nombre d'éléments liés au ticket (`Item_Ticket`) |
| **Upsert SQLite** | `findByTicketName` → update si existant, sinon insert |
| **Résilience** | GLPI et SQLite se chargent indépendamment (jamais de blocage mutuel) |
| **Affichage** | Tableau filtrable + popup de détail + 4 cartes de statistiques |
