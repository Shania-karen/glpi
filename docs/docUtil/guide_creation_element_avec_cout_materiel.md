# Guide — Création d'un Élément GLPI avec Coût Matériel

Ce guide montre comment créer une **page de création d'équipement** (Computer, Monitor, etc.) via l'API GLPI REST, avec ajout simultané d'un **coût matériel** en SQLite, et comment intégrer ce coût dans `AssetListWithPrice`.

---

## 1. Service GLPI — `element.js`

```javascript
// src/services/element.js
import { fetchDataAPIRest } from './apiClient';

// Crée un équipement dans GLPI (type = 'Computer', 'Monitor', etc.)
export async function createElement(type, data) {
  return fetchDataAPIRest(type, {
    method: 'POST',
    body: { input: data }
  });
}

// Met à jour un équipement existant
export async function updateElement(type, id, data) {
  return fetchDataAPIRest(`${type}/${id}`, {
    method: 'PUT',
    body: { input: { id, ...data } }
  });
}

// Supprime un équipement
export async function deleteElement(type, id) {
  return fetchDataAPIRest(`${type}/${id}`, {
    method: 'DELETE',
    body: { input: { id } }
  });
}
```

---

## 2. Service Coût Matériel — ajout dans `cost.js`

```javascript
// À ajouter dans src/services/cost.js
const SPRING_API = 'http://localhost:8081/api';

export async function getCoutsMateriel() {
  try {
    const res = await fetch(`${SPRING_API}/coutMateriel`);
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

export async function createCoutMateriel(idTicket, ticketName, designation, cout) {
  const res = await fetch(`${SPRING_API}/coutMateriel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      idTicket:    Number(idTicket),
      ticketName,
      designation,
      cout:        Number(cout)
    })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteCoutMateriel(id) {
  await fetch(`${SPRING_API}/coutMateriel/${id}`, { method: 'DELETE' });
}
```

---

## 3. Page de Création — `ElementCreate.jsx`

```jsx
// src/pages/frontoffice/ElementCreate.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  H2, Card, FormGroup, Label, Input, Select, Textarea, Button, Alert, Spinner
} from '../../components/templates';
import { createElement } from '../../services/element';
import { createCoutMateriel } from '../../services/cost';

const TYPES = ['Computer', 'Monitor', 'Printer', 'NetworkEquipment', 'Phone'];

export default function ElementCreate() {
  const navigate = useNavigate();

  // Formulaire équipement GLPI
  const [form, setForm] = useState({
    type:     'Computer',
    name:     '',
    serial:   '',
    otherserial: '',
    comment:  ''
  });

  // Formulaire coût matériel SQLite
  const [coutForm, setCoutForm] = useState({
    designation: '',
    cout:        ''
  });

  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState(null);
  const [success, setSuccess]   = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleCoutChange = (e) => {
    const { name, value } = e.target;
    setCoutForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError('Le nom est obligatoire.');
    setLoading(true);
    setError(null);

    try {
      // 1. Créer l'équipement dans GLPI
      const created = await createElement(form.type, {
        name:        form.name,
        serial:      form.serial,
        otherserial: form.otherserial,
        comment:     form.comment
      });

      // 2. Si un coût matériel est renseigné → le sauvegarder dans SQLite
      if (coutForm.designation.trim() && parseFloat(coutForm.cout) > 0) {
        await createCoutMateriel(
          created.id || 0,
          form.name,
          coutForm.designation,
          parseFloat(coutForm.cout)
        );
      }

      setSuccess(true);
      setTimeout(() => navigate('/mes-elements'), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <H2>Nouvel Équipement</H2>

      {error   && <Alert variant="error">{error}</Alert>}
      {success && <Alert variant="success">Équipement créé avec succès !</Alert>}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── Informations GLPI ─────────────────────────────── */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">
            Informations GLPI
          </h3>

          <FormGroup>
            <Label>Type d'équipement</Label>
            <Select name="type" value={form.type} onChange={handleChange}>
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </Select>
          </FormGroup>

          <FormGroup>
            <Label required>Nom</Label>
            <Input name="name" value={form.name} onChange={handleChange}
                   placeholder="ex: PC-ADM-002" required />
          </FormGroup>

          <div className="grid grid-cols-2 gap-4">
            <FormGroup>
              <Label>Numéro de série</Label>
              <Input name="serial" value={form.serial} onChange={handleChange}
                     placeholder="ex: ITU-2026-0099" />
            </FormGroup>
            <FormGroup>
              <Label>Numéro d'inventaire</Label>
              <Input name="otherserial" value={form.otherserial} onChange={handleChange}
                     placeholder="ex: INV-099" />
            </FormGroup>
          </div>

          <FormGroup>
            <Label>Commentaire</Label>
            <Textarea name="comment" value={form.comment} onChange={handleChange}
                      rows={3} placeholder="Informations complémentaires..." />
          </FormGroup>
        </Card>

        {/* ── Coût Matériel SQLite ──────────────────────────── */}
        <Card className="p-6 space-y-4">
          <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider">
            Coût Matériel <span className="text-neutral-400 font-normal">(optionnel)</span>
          </h3>

          <FormGroup>
            <Label>Désignation du matériel acheté</Label>
            <Input name="designation" value={coutForm.designation}
                   onChange={handleCoutChange}
                   placeholder="ex: Câble réseau RJ45, SSD 256Go..." />
          </FormGroup>

          <FormGroup>
            <Label>Coût (€)</Label>
            <Input name="cout" type="number" step="0.01" min="0"
                   value={coutForm.cout} onChange={handleCoutChange}
                   placeholder="0.00" />
          </FormGroup>
        </Card>

        {/* ── Actions ───────────────────────────────────────── */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline"
                  onClick={() => navigate('/mes-elements')}>
            Annuler
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? <Spinner size="sm" /> : 'Créer l\'équipement'}
          </Button>
        </div>

      </form>
    </div>
  );
}
```

---

## 4. Route à ajouter dans `App.jsx`

```jsx
// Ajouter l'import
import ElementCreate from './pages/frontoffice/ElementCreate';

// Ajouter la route dans le <Route element={<SidebarLayout />}>
<Route path="mes-elements/new" element={<ElementCreate />} />
```

---

## 5. Bouton d'accès dans `AssetList.jsx`

```jsx
// Dans la barre d'actions de AssetList.jsx, ajouter :
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();

// Dans le JSX, au-dessus du tableau :
<div className="flex justify-end mb-4">
  <Button onClick={() => navigate('/mes-elements/new')}>
    + Nouvel Équipement
  </Button>
</div>
```

---

## 6. Modification de `AssetListWithPrice.jsx` — Intégration du Coût Matériel

### 6.1 Imports à ajouter

```javascript
import { getCoutsMateriel } from '../../services/cost';
```

### 6.2 Nouvel état

```javascript
const [coutsMateriel, setCoutsMateriel] = useState([]);
```

### 6.3 Chargement dans `useEffect`

```javascript
// Dans loadExtraData(), ajouter getCoutsMateriel() en parallèle
const [links, scList, cmList] = await Promise.all([
  fetchAllRest('Item_Ticket').catch(() => []),
  getSuperCosts(),
  getCoutsMateriel()       // ← nouveau
]);
setItemTickets(links);
setSuperCosts(scList);
setCoutsMateriel(cmList); // ← nouveau
```

### 6.4 Map pré-calculée dans `processedAssets` (useMemo)

```javascript
// Après les maps superCostById / superCostByName, ajouter :
const materielByTicketId = {};
coutsMateriel.forEach(cm => {
  const id = String(cm.idTicket || '');
  if (id) materielByTicketId[id] = (materielByTicketId[id] || 0) + Number(cm.cout || 0);
});
```

### 6.5 Calcul par ticket

```javascript
// Après rawSuperCost, ajouter :
const rawMaterielCost = materielByTicketId[ticketIdStr] || 0;
const materielCost    = rawMaterielCost / linkCount;

return {
  ...
  fixedCost,
  superCost,
  materielCost,  // ← nouveau
  totalCost: fixedCost + superCost + materielCost
};
```

### 6.6 Agrégation par équipement

```javascript
const totalFixedCost    = linkedTicketsInfo.reduce((s, t) => s + t.fixedCost, 0);
const totalSuperCost    = linkedTicketsInfo.reduce((s, t) => s + t.superCost, 0);
const totalMaterielCost = linkedTicketsInfo.reduce((s, t) => s + t.materielCost, 0); // ← nouveau
const grandTotalCost    = totalFixedCost + totalSuperCost + totalMaterielCost;

return {
  ...asset,
  linkedTickets: linkedTicketsInfo,
  totalFixedCost,
  totalSuperCost,
  totalMaterielCost,  // ← nouveau
  grandTotalCost
};
```

### 6.7 Colonne dans le tableau JSX (minimum)

```jsx
{/* En-tête */}
<th className="px-6 py-4 text-right">Coût Matériel</th>

{/* Cellule par ligne */}
<td className="px-6 py-4 text-right font-medium text-emerald-600">
  {asset.totalMaterielCost > 0
    ? `${asset.totalMaterielCost.toFixed(2)} €`
    : '-'}
</td>
```

### 6.8 Carte de stat globale (minimum)

```jsx
<Card className="p-5 flex flex-col justify-between border-neutral-200 bg-white">
  <span className="text-xs text-emerald-600 font-bold uppercase tracking-wider">
    Coûts Matériels (SQLite)
  </span>
  <p className="text-2xl font-bold text-emerald-700 mt-2">
    {(stats.materielTotal || 0).toFixed(2)} €
  </p>
</Card>
```

Ajouter `materielTotal` dans le `useMemo` de `stats` :
```javascript
processedAssets.forEach(a => {
  fixedTotal    += a.totalFixedCost    || 0;
  superTotal    += a.totalSuperCost    || 0;
  materielTotal += a.totalMaterielCost || 0;  // ← nouveau
});
return { fixedTotal, superTotal, materielTotal,
         grandTotal: fixedTotal + superTotal + materielTotal, ... };
```

---

## 7. Résultat Final

### Page de Création (`/mes-elements/new`)
```
┌─────────────────────────────────────────────────┐
│  Informations GLPI                              │
│  Type : [Computer ▼]                            │
│  Nom * : [PC-LAB-010_______________]            │
│  Série : [ITU-2026-0099]  Inventaire: [INV-099] │
│  Commentaire : [________________________]       │
├─────────────────────────────────────────────────┤
│  Coût Matériel (optionnel)                      │
│  Désignation : [SSD 512Go Samsung___________]   │
│  Coût (€) :    [89.99___]                       │
├─────────────────────────────────────────────────┤
│                     [Annuler]  [Créer l'équipement] │
└─────────────────────────────────────────────────┘
```

### Tableau `AssetListWithPrice` avec nouvelle colonne
```
Équipement   | Coût Fixe | Super Coût | Coût Matériel | TOTAL
─────────────┼───────────┼────────────┼───────────────┼──────────
PC-ADM-001   | 160.45 €  | 75.00 €    | 89.99 €       | 325.44 €
PC-LAB-010   | 0.00 €    | 0.00 €     | 89.99 €       | 89.99 €
Monitor-01   | 45.00 €   | 0.00 €     | -             | 45.00 €
```

> [!IMPORTANT]
> La création dans GLPI via `POST /Computer` requiert que la session GLPI soit initialisée (`fetchDataAPIRest` le fait automatiquement via `initSession()`).

> [!NOTE]
> Le coût matériel est lié au `idTicket`, pas directement à l'équipement. Si aucun ticket n'est associé lors de la création, le coût est enregistré avec `idTicket = created.id` (id de l'élément créé) et `ticketName = form.name`.
