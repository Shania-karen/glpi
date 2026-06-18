# Scénario — CRUD Coût Matériel & Intégration dans le Total des Équipements

Ce document décrit comment implémenter un **CRUD complet pour un coût matériel** (`CoutMateriel`) stocké en SQLite, et comment l'intégrer dans le calcul du coût total affiché dans `AssetListWithPrice`.

---

## 📋 Objectif
,,,,
| Élément | Description |
|---|---|
| **Entité** | `CoutMateriel` (SQLite) — coût d'un matériel acheté pour un ticket |
| **Champs** | `id`, `idTicket`, `ticketName`, `designation`, `cout` |
| **CRUD** | Créer, lire, modifier, supprimer via Spring Boot REST |
| **Impact** | Intégré dans le calcul : `Total = FixedCost + SuperCost + CoutMateriel` |

---

## 1. Modèle Java — `CoutMateriel.java`

```java
package com.eval.sqlite.model;

import jakarta.persistence.*;

@Entity
@Table(name = "coutMateriel")
public class CoutMateriel {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long   idTicket;
    private String ticketName;
    private String designation;  // ex: "Câble réseau RJ45", "Disque SSD 256Go"
    private double cout;

    // Getters et Setters
    public Long getId()              { return id; }
    public void setId(Long id)       { this.id = id; }

    public Long getIdTicket()               { return idTicket; }
    public void setIdTicket(Long idTicket)  { this.idTicket = idTicket; }

    public String getTicketName()                   { return ticketName; }
    public void setTicketName(String ticketName)    { this.ticketName = ticketName; }

    public String getDesignation()                    { return designation; }
    public void setDesignation(String designation)   { this.designation = designation; }

    public double getCout()              { return cout; }
    public void setCout(double cout)     { this.cout = cout; }
}
```

---

## 2. Repository — `CoutMaterielRepository.java`

```java
package com.eval.sqlite.repository;

import com.eval.sqlite.model.CoutMateriel;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CoutMaterielRepository extends JpaRepository<CoutMateriel, Long> {

    // Récupérer tous les coûts matériels d'un ticket spécifique
    List<CoutMateriel> findByIdTicket(Long idTicket);

    // Récupérer par nom de ticket
    List<CoutMateriel> findByTicketName(String ticketName);
}
```

---

## 3. Controller REST — `CoutMaterielController.java`

```java
package com.eval.sqlite.controller;

import com.eval.sqlite.model.CoutMateriel;
import com.eval.sqlite.repository.CoutMaterielRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "http://localhost:5173")
public class CoutMaterielController {

    @Autowired
    private CoutMaterielRepository coutMaterielRepository;

    // ─── READ ALL ──────────────────────────────────────────────
    @GetMapping("/coutMateriel")
    public List<CoutMateriel> getAll() {
        return coutMaterielRepository.findAll();
    }

    // ─── READ BY TICKET ────────────────────────────────────────
    @GetMapping("/coutMateriel/ticket/{idTicket}")
    public List<CoutMateriel> getByTicket(@PathVariable Long idTicket) {
        return coutMaterielRepository.findByIdTicket(idTicket);
    }

    // ─── CREATE ────────────────────────────────────────────────
    @PostMapping("/coutMateriel")
    public CoutMateriel create(@RequestBody CoutMateriel cout) {
        return coutMaterielRepository.save(cout);
    }

    // ─── UPDATE ────────────────────────────────────────────────
    @PutMapping("/coutMateriel/{id}")
    public ResponseEntity<CoutMateriel> update(
            @PathVariable Long id,
            @RequestBody CoutMateriel updated) {
        return coutMaterielRepository.findById(id)
            .map(existing -> {
                existing.setDesignation(updated.getDesignation());
                existing.setCout(updated.getCout());
                existing.setIdTicket(updated.getIdTicket());
                existing.setTicketName(updated.getTicketName());
                return ResponseEntity.ok(coutMaterielRepository.save(existing));
            })
            .orElse(ResponseEntity.notFound().build());
    }

    // ─── DELETE ────────────────────────────────────────────────
    @DeleteMapping("/coutMateriel/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!coutMaterielRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        coutMaterielRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
```

### Endpoints disponibles

| Méthode | URL | Action |
|---|---|---|
| `GET` | `/api/coutMateriel` | Tous les coûts matériels |
| `GET` | `/api/coutMateriel/ticket/{id}` | Coûts d'un ticket précis |
| `POST` | `/api/coutMateriel` | Créer un coût |
| `PUT` | `/api/coutMateriel/{id}` | Modifier un coût |
| `DELETE` | `/api/coutMateriel/{id}` | Supprimer un coût |

---

## 4. Service Frontend — `coutMateriel.js`

```javascript
// src/services/coutMateriel.js
const SPRING_API = 'http://localhost:8081/api';

// ─── READ ALL ──────────────────────────────────────────────────
export async function getCoutsMateriel() {
  try {
    const res = await fetch(`${SPRING_API}/coutMateriel`);
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.warn('[getCoutsMateriel] Erreur:', err.message);
    return [];
  }
}

// ─── CREATE ────────────────────────────────────────────────────
export async function createCoutMateriel(idTicket, ticketName, designation, cout) {
  const res = await fetch(`${SPRING_API}/coutMateriel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idTicket:    Number(idTicket),
      ticketName,
      designation,
      cout:        Number(cout)
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── UPDATE ────────────────────────────────────────────────────
export async function updateCoutMateriel(id, data) {
  const res = await fetch(`${SPRING_API}/coutMateriel/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...data,
      idTicket: Number(data.idTicket),
      cout:     Number(data.cout)
    }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// ─── DELETE ────────────────────────────────────────────────────
export async function deleteCoutMateriel(id) {
  const res = await fetch(`${SPRING_API}/coutMateriel/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(await res.text());
}
```

---

## 5. Formulaire React — Saisie d'un Coût Matériel

```jsx
// Exemple dans TicketApprovalModal.jsx ou une page dédiée
import { createCoutMateriel } from '../../services/coutMateriel';

const [materielForm, setMaterielForm] = useState({
  designation: '',
  cout: 0
});

const handleAddMateriel = async () => {
  if (!materielForm.designation.trim() || materielForm.cout <= 0) return;

  await createCoutMateriel(
    ticketId,
    ticket?.name || '',
    materielForm.designation,
    parseFloat(materielForm.cout)
  );
  setMaterielForm({ designation: '', cout: 0 });
};

// Rendu du formulaire
return (
  <div className="space-y-3">
    <label className="text-xs font-bold text-neutral-500 uppercase">
      Coût Matériel
    </label>

    <input
      type="text"
      placeholder="Désignation (ex: Câble réseau RJ45)"
      value={materielForm.designation}
      onChange={e => setMaterielForm(p => ({ ...p, designation: e.target.value }))}
      className="w-full border border-neutral-300 rounded-lg p-2 text-sm"
    />

    <input
      type="number"
      step="0.01"
      min="0"
      placeholder="Coût (€)"
      value={materielForm.cout}
      onChange={e => setMaterielForm(p => ({ ...p, cout: e.target.value }))}
      className="w-full border border-neutral-300 rounded-lg p-2 text-sm"
    />

    <button onClick={handleAddMateriel}
      className="bg-black text-white text-sm px-4 py-2 rounded-lg hover:bg-neutral-800">
      + Ajouter le matériel
    </button>
  </div>
);
```

---

## 6. Intégration dans `AssetListWithPrice.jsx`

### Chargement des coûts matériels

```javascript
import { getCoutsMateriel } from '../../services/coutMateriel';

const [coutsMateriel, setCoutsMateriel] = useState([]);

useEffect(() => {
  async function loadExtraData() {
    const [links, scList, cmList] = await Promise.all([
      fetchAllRest('Item_Ticket').catch(() => []),
      getSuperCosts(),
      getCoutsMateriel()   // ← nouveau
    ]);
    setItemTickets(links);
    setSuperCosts(scList);
    setCoutsMateriel(cmList);  // ← nouveau
  }
  loadExtraData();
}, []);
```

### Pré-calcul des maps (dans `processedAssets`)

```javascript
// Map des coûts matériels par idTicket
const materielCostByTicketId = {};
coutsMateriel.forEach(cm => {
  const id = String(cm.idTicket || '');
  if (id) {
    materielCostByTicketId[id] = (materielCostByTicketId[id] || 0) + Number(cm.cout || 0);
  }
});
```

### Calcul par ticket (dans la boucle `linkedTicketsInfo`)

```javascript
// Coût matériel total pour ce ticket (depuis SQLite)
const rawMaterielCost = materielCostByTicketId[ticketIdStr] || 0;

// Proratisation par nombre d'équipements liés
const materielCost = rawMaterielCost / linkCount;

return {
  id: ticket.id,
  name: ticket.name || 'Sans titre',
  status: ticket.status?.name || ticket.status || 'Nouveau',
  fixedCost,    // GLPI : cost_fixed + cost_time × heures
  superCost,    // SQLite : super coût de refus
  materielCost, // SQLite : coût matériel ← nouveau
  totalCost: fixedCost + superCost + materielCost,  // total complet
  rawFixedCost, rawSuperCost, rawMaterielCost, linkCount
};
```

### Agrégation par équipement

```javascript
const totalFixedCost    = linkedTicketsInfo.reduce((s, t) => s + t.fixedCost, 0);
const totalSuperCost    = linkedTicketsInfo.reduce((s, t) => s + t.superCost, 0);
const totalMaterielCost = linkedTicketsInfo.reduce((s, t) => s + t.materielCost, 0);
const grandTotalCost    = totalFixedCost + totalSuperCost + totalMaterielCost;
```

### Affichage dans le tableau

```jsx
<td className="px-6 py-4 text-right font-medium text-emerald-600">
  {asset.totalMaterielCost > 0 ? `${asset.totalMaterielCost.toFixed(2)} €` : '-'}
</td>
<td className="px-6 py-4 text-right font-bold text-neutral-950">
  {asset.grandTotalCost > 0 ? `${asset.grandTotalCost.toFixed(2)} €` : '-'}
</td>
```

---

## 7. Résultat Final du Tableau

```
Équipement    | Coût Fixe GLPI | Super Coût | Coût Matériel | TOTAL
──────────────┼────────────────┼────────────┼───────────────┼──────────
PC-ADM-001    | 159.00 €       | 75.00 €    | 45.00 €       | 279.00 €
Monitor-01    | 45.00 €        | 0.00 €     | 0.00 €        | 45.00 €
Printer-01    | 0.00 €         | 30.00 €    | 120.00 €      | 150.00 €
──────────────┼────────────────┼────────────┼───────────────┼──────────
TOTAL         | 204.00 €       | 105.00 €   | 165.00 €      | 474.00 €
```

---

## 8. Formule Complète du Coût Total

```
TOTAL ÉQUIPEMENT =
  Σ (cost_fixed + cost_time × actiontime_heures) [GLPI]   ← coûts fixes et horaires
  ÷ nombre_éléments_liés                                   ← proratisation
+
  cout [SQLite : superCout]                                ← pénalité de refus
  ÷ nombre_éléments_liés
+
  Σ cout [SQLite : coutMateriel]                           ← matériaux achetés
  ÷ nombre_éléments_liés
```

> [!NOTE]
> Le coût matériel peut avoir **plusieurs entrées** par ticket (ex: câble + disque + connecteur). La somme est aggrégée avant proratisation.

> [!IMPORTANT]
> Les trois sources (GLPI, super coût, coût matériel) se chargent **indépendamment** via `Promise.all` — si l'un des serveurs est hors ligne, les autres s'affichent quand même.
