# Modification par Élément dans `ListModifiable`

## Contexte & Problème

Actuellement, la page **ListModifiable** (`ListModifiable.jsx`) regroupe les coûts par **groupe (`grp`)** — un groupe correspondant à un seul ticket. L'édition via `updateCoutGroup` modifie **toutes les lignes du groupe en même temps**.

> **Exemple :** Un ticket a 2 éléments liés (un Ordinateur + un Moniteur). Le groupe contient donc 2 lignes dans la table `couts`. Modifier le groupe entier redistribue le coût uniformément sur les 2 lignes — il est impossible de ne changer que le coût de l'Ordinateur.

### Objectif

Permettre de **modifier un seul élément (`idItem`)** d'un groupe sans toucher les autres lignes.

---

## Architecture Actuelle (Rappel)

```
Table SQLite "couts"
┌────────┬──────────┬──────────┬────────┬──────────┬──────────┬──────────┬──────────┐
│ idAuto │ idTicket │  typeCout│  cout  │  idItem  │ category │   grp    │  mode/valeur │
├────────┼──────────┼──────────┼────────┼──────────┼──────────┼──────────┼──────────┤
│   1    │    42    │ Supercout│ 150.00 │   101    │ Computer │ 17000001 │    -     │
│   2    │    42    │ Supercout│ 150.00 │   202    │ Monitor  │ 17000001 │    -     │
└────────┴──────────┴──────────┴────────┴──────────┴──────────┴──────────┴──────────┘
```

Un ticket avec 2 éléments = **2 lignes dans le même groupe** (même `grp`).

---

## Ce qu'il faut faire

### 1. Backend — Nouveau endpoint `PUT /api/couts/{idAuto}`

Ajouter dans **`CoutController.java`** un endpoint pour modifier **une seule ligne par son `idAuto`** :

```java
// Dans CoutController.java
@PutMapping("/couts/{id}")
public ResponseEntity<?> updateSingle(
    @PathVariable Long id,
    @RequestBody Cout updatedData
) {
    Optional<Cout> opt = coutRepository.findById(id);
    if (opt.isEmpty()) {
        return ResponseEntity.notFound().build();
    }

    Cout row = opt.get();
    String type = row.getTypeCout();

    if ("Supercout".equalsIgnoreCase(type)) {
        if (updatedData.getCout() != null) {
            row.setCout(updatedData.getCout());
        }
    } else if ("reouverture".equalsIgnoreCase(type)) {
        if (updatedData.getMode() != null) row.setMode(updatedData.getMode());
        if (updatedData.getValeur() != null) row.setValeur(updatedData.getValeur());

        double base = computeBase(row.getIdTicket(), updatedData.getMode());
        double newCout = Math.round((base * updatedData.getValeur()) / 100.0 * 100) / 100.0;
        row.setCout(newCout);
    }

    coutRepository.save(row);
    return ResponseEntity.ok(row);
}
```

#### Helper `computeBase` dans `CoutController.java`

```java
private double computeBase(Long idTicket, Integer mode) {
    List<Cout> allCouts = coutRepository.findByIdTicketAndTypeCout(idTicket, "Supercout");
    
    Map<Long, Double> superTotaux = new LinkedHashMap<>();
    for (Cout c : allCouts) {
        superTotaux.merge(c.getGrp(), c.getCout(), Double::sum);
    }
    
    List<Double> totaux = new ArrayList<>(superTotaux.values());
    if (totaux.isEmpty()) return 0.0;

    if (mode == null || mode == 1) return totaux.get(totaux.size() - 1);
    if (mode == 2) return totaux.get(0);
    if (mode == 3) return totaux.stream().mapToDouble(d -> d).average().orElse(0);
    if (mode == 4) return totaux.stream().mapToDouble(d -> d).sum();
    return 0.0;
}
```

> [!IMPORTANT]
> Ne pas oublier d'ajouter `PUT` dans le `@CrossOrigin` du contrôleur :
> ```java
> methods = { RequestMethod.GET, RequestMethod.POST,
>             RequestMethod.DELETE, RequestMethod.PUT, RequestMethod.OPTIONS }
> ```

---

### 2. Frontend Service — Nouvelle fonction `updateCoutById`

Ajouter dans **`coutService.js`** :

```js
/**
 * Modifie UNE SEULE ligne de coût par son idAuto.
 * @param {number} idAuto  - Identifiant unique de la ligne
 * @param {object} data    - { cout?, mode?, valeur? }
 */
export async function updateCoutById(idAuto, { cout, mode, valeur }) {
  const payload = {};
  if (cout !== undefined)   payload.cout   = Number(cout);
  if (mode !== undefined)   payload.mode   = Number(mode);
  if (valeur !== undefined) payload.valeur = Number(valeur);

  const res = await fetch(`${SPRING_API}/couts/${idAuto}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Erreur modification cout id=${idAuto}`);
  }
  return res.json();
}
```

---

### 3. Frontend — Refactoriser `ListModifiable.jsx`

#### 3.1 Ajouter l'import de la nouvelle fonction

```jsx
import { getAllCouts, updateCoutGroup, updateCoutById } from '../../services/coutService';
```

#### 3.2 Nouveau state à ajouter

```jsx
// État pour le sélecteur d'élément (quel groupe on explore)
const [elementPickerGroup, setElementPickerGroup] = useState(null);
// État pour l'édition de la ligne individuelle
const [editRow, setEditRow]         = useState(null);
const [editRowCout, setEditRowCout] = useState(0);
const [editRowMode, setEditRowMode] = useState(1);
const [editRowValeur, setEditRowValeur] = useState(0);
```

#### 3.3 Handlers à ajouter

```jsx
const handleOpenElementPicker = (group) => {
  setElementPickerGroup(group);
};

const handleOpenEditRow = (row) => {
  setEditRow(row);
  setEditRowCout(row.cout || 0);
  setEditRowMode(row.mode || 1);
  setEditRowValeur(row.valeur || 0);
};

const handleSaveRow = async () => {
  if (!editRow) return;
  try {
    const payload = editRow.typeCout === 'reouverture'
      ? { mode: editRowMode, valeur: editRowValeur }
      : { cout: editRowCout };

    await updateCoutById(editRow.idAuto, payload);
    setEditRow(null);
    await loadData();
  } catch (err) {
    console.error('Erreur modification élément:', err);
    alert('Erreur : ' + err.message);
  }
};
```

#### 3.4 Modifier le bouton dans le tableau existant

Dans `<Td>` de la colonne Actions, ajouter un bouton **"Par élément"** conditionnel :

```jsx
<Td>
  {/* Bouton existant */}
  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(group)}>
    Modifier groupe
  </Button>

  {/* NOUVEAU : visible seulement si le groupe a plusieurs éléments */}
  {group.rows.length > 1 && (
    <Button
      variant="ghost"
      size="sm"
      className="ml-2"
      onClick={() => handleOpenElementPicker(group)}
    >
      Par élément ({group.rows.length})
    </Button>
  )}
</Td>
```

#### 3.5 Modal sélecteur d'élément (nouveau)

Ajouter après le `</Modal>` existant :

```jsx
{/* Modal 1 : choisir l'élément à modifier */}
<Modal
  open={!!elementPickerGroup}
  onClose={() => setElementPickerGroup(null)}
  title={`Choisir un élément — Ticket #${elementPickerGroup?.idTicket}`}
>
  <Modal.Body>
    <Table>
      <thead>
        <Tr>
          <Th>ID Élément</Th>
          <Th>Catégorie</Th>
          <Th>Coût actuel</Th>
          <Th>Action</Th>
        </Tr>
      </thead>
      <tbody>
        {elementPickerGroup?.rows.map(row => (
          <Tr key={row.idAuto}>
            <Td>{row.idItem || 'N/A'}</Td>
            <Td>{row.category || '-'}</Td>
            <Td className="font-semibold">{row.cout.toFixed(2)} €</Td>
            <Td>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setElementPickerGroup(null);
                  handleOpenEditRow(row);
                }}
              >
                Modifier
              </Button>
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  </Modal.Body>
</Modal>

{/* Modal 2 : éditer la ligne individuelle */}
<Modal
  open={!!editRow}
  onClose={() => setEditRow(null)}
  title={`Modifier élément — ${editRow?.category || 'N/A'} #${editRow?.idItem}`}
>
  <Modal.Body className="space-y-4">
    <div className="bg-neutral-50 rounded-lg p-3 text-sm text-neutral-600">
      <p>Ticket <strong>#{editRow?.idTicket}</strong></p>
      <p>Type : <strong>{editRow?.typeCout}</strong></p>
      <p>idAuto : <strong>{editRow?.idAuto}</strong></p>
    </div>

    {editRow?.typeCout === 'reouverture' ? (
      <>
        <FormGroup>
          <Label>Mode de calcul</Label>
          <Select value={editRowMode} onChange={e => setEditRowMode(Number(e.target.value))}>
            <option value={1}>Mode 1 (Dernier Supercost)</option>
            <option value={2}>Mode 2 (Premier Supercost)</option>
            <option value={3}>Mode 3 (Moyenne des Supercosts)</option>
            <option value={4}>Mode 4 (Somme des Supercosts)</option>
          </Select>
        </FormGroup>
        <FormGroup>
          <Label>Pourcentage (%)</Label>
          <Input
            type="number"
            value={editRowValeur}
            onChange={e => setEditRowValeur(Number(e.target.value))}
          />
        </FormGroup>
      </>
    ) : (
      <FormGroup>
        <Label>Coût de cet élément (€)</Label>
        <Input
          type="number"
          value={editRowCout}
          onChange={e => setEditRowCout(Number(e.target.value))}
        />
      </FormGroup>
    )}
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setEditRow(null)}>
      Annuler
    </Button>
    <Button variant="primary" onClick={handleSaveRow}>
      Valider
    </Button>
  </Modal.Footer>
</Modal>
```

---

## Résumé des fichiers à modifier

| Fichier | Changement |
|---|---|
| `CoutController.java` | Ajouter `PUT /api/couts/{id}` + helper `computeBase` + `PUT` dans `@CrossOrigin` |
| `coutService.js` | Ajouter `updateCoutById(idAuto, data)` |
| `ListModifiable.jsx` | Nouveaux states + handlers + bouton "Par élément" + 2 modaux |

---

## Flux utilisateur final

```
ListModifiable
    │
    ├─ Ticket #42 — Supercout — 300€ (2 éléments)
    │       ├─ [Modifier groupe]       → modal actuel (répartit 300€ sur tous)
    │       └─ [Par élément (2)]       → NOUVEAU modal sélecteur
    │                                       ├─ Ordinateur #101 — 150€ → [Modifier] → modal éditeur
    │                                       └─ Moniteur #202 — 150€   → [Modifier] → modal éditeur
    │
    └─ Ticket #55 — reouverture — 1 élément
            └─ [Modifier groupe]       → modal actuel (1 seul élément = même résultat)
```

> [!TIP]
> Le bouton **"Par élément"** n'apparaît que si `group.rows.length > 1`. Pour les groupes à 1 élément, le bouton "Modifier groupe" est suffisant.

---

## Points de vigilance

> [!WARNING]
> **Désynchronisation possible** : modifier un seul élément d'un groupe `reouverture` lui attribue un mode/valeur indépendant des autres lignes du même groupe. C'est le comportement voulu. Le backend calcule la base Supercout globale du ticket (pas par idItem).

> [!NOTE]
> **Pas de `recalculateTicket()` pour Supercout unitaire** : le endpoint `PUT /api/couts/{id}` ne déclenche **pas** de recalcul en cascade, pour éviter d'écraser les autres valeurs manuelles du groupe.
