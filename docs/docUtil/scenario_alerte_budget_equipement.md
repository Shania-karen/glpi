# Scénario — Système d'Alerte de Dépassement de Budget par Équipement

Ce scénario décrit l'implémentation d'un **système d'alerte budgétaire** : chaque équipement peut se voir attribuer un budget maximum en SQLite. Si le coût total consolidé (GLPI + Super Coût + Coût Matériel) dépasse ce seuil, une alerte visuelle s'affiche dans `AssetListWithPrice`.

---

## 📋 Objectif

| Élément | Description |
|---|---|
| **Entité** | `BudgetEquipement` (SQLite) — seuil budgétaire par équipement |
| **Champs** | `id`, `itemId`, `itemType`, `itemName`, `budgetMax` |
| **CRUD** | Créer, lire, modifier, supprimer via Spring Boot REST |
| **Impact** | Si `grandTotalCost > budgetMax` → badge rouge "Dépassement" dans le tableau |

---

## 1. Modèle Java — `BudgetEquipement.java`

```java
package com.eval.sqlite.model;

import jakarta.persistence.*;

@Entity
@Table(name = "budgetEquipement")
public class BudgetEquipement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long   itemId;       // ID de l'équipement dans GLPI
    private String itemType;     // ex: "Computer", "Monitor"
    private String itemName;     // ex: "PC-ADM-001"
    private double budgetMax;    // seuil en €

    public Long   getId()                    { return id; }
    public void   setId(Long id)             { this.id = id; }

    public Long   getItemId()                { return itemId; }
    public void   setItemId(Long itemId)     { this.itemId = itemId; }

    public String getItemType()                  { return itemType; }
    public void   setItemType(String itemType)   { this.itemType = itemType; }

    public String getItemName()                  { return itemName; }
    public void   setItemName(String itemName)   { this.itemName = itemName; }

    public double getBudgetMax()                 { return budgetMax; }
    public void   setBudgetMax(double budgetMax) { this.budgetMax = budgetMax; }
}
```

---

## 2. Repository — `BudgetEquipementRepository.java`

```java
package com.eval.sqlite.repository;

import com.eval.sqlite.model.BudgetEquipement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface BudgetEquipementRepository extends JpaRepository<BudgetEquipement, Long> {

    // Rechercher le budget d'un équipement précis par itemId + itemType
    Optional<BudgetEquipement> findByItemIdAndItemType(Long itemId, String itemType);

    // Rechercher par nom
    Optional<BudgetEquipement> findByItemName(String itemName);
}
```

---

## 3. Controller REST — `BudgetEquipementController.java`

```java
package com.eval.sqlite.controller;

import com.eval.sqlite.model.BudgetEquipement;
import com.eval.sqlite.repository.BudgetEquipementRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class BudgetEquipementController {

    @Autowired
    private BudgetEquipementRepository budgetRepo;

    // ─── READ ALL ──────────────────────────────────────────────
    @GetMapping("/budget")
    public List<BudgetEquipement> getAll() {
        return budgetRepo.findAll();
    }

    // ─── READ ONE ──────────────────────────────────────────────
    @GetMapping("/budget/{id}")
    public ResponseEntity<BudgetEquipement> getOne(@PathVariable Long id) {
        return budgetRepo.findById(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    // ─── CREATE / UPSERT ───────────────────────────────────────
    @PostMapping("/budget")
    public BudgetEquipement create(@RequestBody BudgetEquipement budget) {
        // Upsert : mettre à jour si l'équipement existe déjà
        return budgetRepo.findByItemIdAndItemType(budget.getItemId(), budget.getItemType())
            .map(existing -> {
                existing.setBudgetMax(budget.getBudgetMax());
                existing.setItemName(budget.getItemName());
                return budgetRepo.save(existing);
            })
            .orElseGet(() -> budgetRepo.save(budget));
    }

    // ─── UPDATE ────────────────────────────────────────────────
    @PutMapping("/budget/{id}")
    public ResponseEntity<BudgetEquipement> update(
            @PathVariable Long id,
            @RequestBody BudgetEquipement updated) {
        return budgetRepo.findById(id)
            .map(existing -> {
                existing.setBudgetMax(updated.getBudgetMax());
                existing.setItemName(updated.getItemName());
                return ResponseEntity.ok(budgetRepo.save(existing));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ─── DELETE ────────────────────────────────────────────────
    @DeleteMapping("/budget/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!budgetRepo.existsById(id)) return ResponseEntity.notFound().build();
        budgetRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
```

### Endpoints disponibles

| Méthode | URL | Action |
|---|---|---|
| `GET` | `/api/budget` | Tous les budgets enregistrés |
| `GET` | `/api/budget/{id}` | Un budget par ID SQLite |
| `POST` | `/api/budget` | Créer ou mettre à jour (upsert par itemId+itemType) |
| `PUT` | `/api/budget/{id}` | Modifier un budget existant |
| `DELETE` | `/api/budget/{id}` | Supprimer un budget |

---

## 4. Service Frontend — `budget.js`

```javascript
// src/services/budget.js
const SPRING_API = 'http://localhost:8081/api';

// ─── READ ALL ──────────────────────────────────────────────────
export async function getBudgets() {
  try {
    const res = await fetch(`${SPRING_API}/budget`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('[getBudgets] Spring Boot hors ligne:', err.message);
    return [];
  }
}

// ─── CREATE / UPSERT ───────────────────────────────────────────
export async function saveBudget(itemId, itemType, itemName, budgetMax) {
  const res = await fetch(`${SPRING_API}/budget`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      itemId:    Number(itemId),
      itemType,
      itemName,
      budgetMax: Number(budgetMax)
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── DELETE ────────────────────────────────────────────────────
export async function deleteBudget(id) {
  const res = await fetch(`${SPRING_API}/budget/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
}
```

---

## 5. Intégration dans `AssetListWithPrice.jsx`

### Chargement des budgets

```javascript
import { getBudgets } from '../../services/budget';

const [budgets, setBudgets] = useState([]);

useEffect(() => {
  async function loadExtraData() {
    const [links, scList, budgetList] = await Promise.all([
      fetchAllRest('Item_Ticket').catch(() => []),
      getSuperCosts(),
      getBudgets()   // ← nouveau
    ]);
    setItemTickets(links);
    setSuperCosts(scList);
    setBudgets(budgetList);  // ← nouveau
  }
  loadExtraData();
}, []);
```

### Pré-calcul de la map budgétaire (dans `processedAssets`)

```javascript
// Map budgétaire : "itemId-itemType" → budgetMax
const budgetMap = {};
budgets.forEach(b => {
  const key = `${b.itemId}-${String(b.itemType).toLowerCase()}`;
  budgetMap[key] = Number(b.budgetMax || 0);
});
```

### Comparaison coût vs budget (dans `assets.map`)

```javascript
return assets.map(asset => {
  // ...calcul de grandTotalCost...

  // Recherche du budget pour cet équipement
  const budgetKey = `${asset.id}-${String(asset.itemtype || asset._itemtype || '').toLowerCase()}`;
  const budgetMax = budgetMap[budgetKey] || null;

  const isOverBudget = budgetMax !== null && grandTotalCost > budgetMax;
  const budgetRatio  = budgetMax ? Math.round((grandTotalCost / budgetMax) * 100) : null;

  return {
    ...asset,
    linkedTickets: linkedTicketsInfo,
    totalFixedCost,
    totalSuperCost,
    grandTotalCost,
    budgetMax,       // ← seuil en €
    isOverBudget,    // ← true si dépassement
    budgetRatio      // ← % du budget consommé
  };
});
```

---

## 6. Affichage de l'Alerte dans le Tableau

```jsx
{/* En-tête avec colonne Budget */}
<th className="px-6 py-4">Budget</th>

{/* Ligne d'équipement */}
<td className="px-6 py-4 text-center">
  {asset.budgetMax !== null ? (
    <div className="flex flex-col items-center gap-1">

      {/* Badge de statut */}
      {asset.isOverBudget ? (
        <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600
                         bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
          ⚠ Dépassement
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600
                         bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
          ✓ Dans le budget
        </span>
      )}

      {/* Détail chiffré */}
      <span className="text-[10px] text-neutral-400">
        {asset.grandTotalCost.toFixed(2)} € / {asset.budgetMax.toFixed(2)} €
        ({asset.budgetRatio}%)
      </span>

      {/* Barre de progression */}
      <div className="w-24 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            asset.isOverBudget ? 'bg-red-500' : 'bg-green-500'
          }`}
          style={{ width: `${Math.min(asset.budgetRatio, 100)}%` }}
        />
      </div>
    </div>
  ) : (
    <span className="text-neutral-300 text-xs italic">Non défini</span>
  )}
</td>
```

---

## 7. Formulaire pour Définir un Budget

```jsx
// Bouton dans chaque ligne du tableau → ouvre un mini-formulaire
const [budgetEdit, setBudgetEdit] = useState({ assetId: null, value: '' });

const handleSaveBudget = async (asset) => {
  await saveBudget(
    asset.id,
    asset.itemtype || asset._itemtype,
    asset.name,
    parseFloat(budgetEdit.value)
  );
  // Recharger les budgets
  getBudgets().then(setBudgets);
  setBudgetEdit({ assetId: null, value: '' });
};

// Dans la colonne Budget du tableau :
{budgetEdit.assetId === asset.id ? (
  <div className="flex gap-1 items-center">
    <input
      type="number"
      autoFocus
      className="w-20 border border-neutral-300 rounded px-1.5 py-1 text-xs"
      value={budgetEdit.value}
      onChange={e => setBudgetEdit(p => ({ ...p, value: e.target.value }))}
      placeholder="€"
    />
    <button
      onClick={() => handleSaveBudget(asset)}
      className="text-xs bg-black text-white px-2 py-1 rounded hover:bg-neutral-800"
    >
      ✓
    </button>
    <button
      onClick={() => setBudgetEdit({ assetId: null, value: '' })}
      className="text-xs text-neutral-500 hover:text-black"
    >
      ✕
    </button>
  </div>
) : (
  <button
    onClick={() => setBudgetEdit({ assetId: asset.id, value: asset.budgetMax || '' })}
    className="text-[10px] text-neutral-400 hover:text-black underline"
  >
    {asset.budgetMax ? `Modifier (${asset.budgetMax} €)` : 'Définir un budget'}
  </button>
)}
```

---

## 8. Résultat Final

```
Équipement    | Coût Total | Budget    | Statut
──────────────┼────────────┼───────────┼─────────────────────────────────
PC-ADM-001    | 279.00 €   | 200.00 €  | ⚠ Dépassement  ████████░░ 139%
Monitor-01    | 45.00 €    | 100.00 €  | ✓ Dans le budget ████░░░░░░  45%
Printer-01    | 150.00 €   | 150.00 €  | ✓ Dans le budget ██████████ 100%
Laptop-02     | 0.00 €     | —         | Non défini
```

---

## 9. Formule de Contrôle Budgétaire

```
isOverBudget = grandTotalCost > budgetMax

grandTotalCost =
  Σ (cost_fixed + cost_time × actiontime_heures) [GLPI]
  ÷ nombre_éléments_liés
+
  superCout [SQLite]
  ÷ nombre_éléments_liés
+
  Σ coutMateriel [SQLite]
  ÷ nombre_éléments_liés

budgetRatio (%) = (grandTotalCost / budgetMax) × 100
```

> [!IMPORTANT]
> Le budget est stocké dans SQLite et chargé **indépendamment** des données GLPI — si Spring Boot est hors ligne, le tableau s'affiche sans colonne budgétaire (valeur `null`) sans crasher.

> [!TIP]
> La mise à jour du budget se fait en **inline editing** directement dans le tableau, sans modale séparée, via un `POST /api/budget` qui fait un upsert automatique par `itemId + itemType`.
