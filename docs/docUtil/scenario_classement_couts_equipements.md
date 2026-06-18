# Scénario — Classement des Équipements par Coût (Top N Plus/Moins Coûteux)

Ce scénario décrit comment implémenter un **classement dynamique des équipements** par coût consolidé, permettant d'identifier rapidement les matériels les plus et les moins onéreux.

---

## 📋 Objectif

| Fonctionnalité | Description |
|---|---|
| **Tri interactif** | Cliquer sur une colonne pour trier ASC ou DESC |
| **Top N** | Afficher uniquement les N équipements les plus coûteux |
| **Podium visuel** | Mise en évidence des rangs 1, 2, 3 |
| **Comparaison** | Vue côte à côte : les 5 plus chers vs les 5 moins chers |

---

## 1. Logique de Tri — `useMemo` dans `AssetListWithPrice.jsx`

```javascript
// État pour le tri
const [sortField, setSortField]     = useState('grandTotalCost'); // colonne triée
const [sortDirection, setSortDirection] = useState('desc');       // 'asc' | 'desc'
const [topN, setTopN]               = useState(null);             // null = tous

// Tableau trié et filtré
const sortedAssets = useMemo(() => {
  const sorted = [...filteredAssets].sort((a, b) => {
    let valA, valB;

    switch (sortField) {
      case 'grandTotalCost':
        valA = a.grandTotalCost || 0;
        valB = b.grandTotalCost || 0;
        break;
      case 'totalFixedCost':
        valA = a.totalFixedCost || 0;
        valB = b.totalFixedCost || 0;
        break;
      case 'totalSuperCost':
        valA = a.totalSuperCost || 0;
        valB = b.totalSuperCost || 0;
        break;
      case 'name':
        valA = (a.name || '').toLowerCase();
        valB = (b.name || '').toLowerCase();
        break;
      default:
        valA = a.grandTotalCost || 0;
        valB = b.grandTotalCost || 0;
    }

    if (typeof valA === 'string') {
      return sortDirection === 'asc'
        ? valA.localeCompare(valB)
        : valB.localeCompare(valA);
    }

    return sortDirection === 'asc' ? valA - valB : valB - valA;
  });

  // Limiter au Top N si activé
  return topN ? sorted.slice(0, topN) : sorted;
}, [filteredAssets, sortField, sortDirection, topN]);
```

---

## 2. En-têtes de Colonnes Cliquables

```jsx
// Composant helper pour les en-têtes triables
function SortableHeader({ label, field, sortField, sortDirection, onSort }) {
  const isActive = sortField === field;
  return (
    <th
      className="px-6 py-4 cursor-pointer select-none hover:bg-neutral-100 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1.5">
        <span>{label}</span>
        <span className="text-neutral-400 text-xs">
          {isActive ? (sortDirection === 'desc' ? '▼' : '▲') : '⇅'}
        </span>
      </div>
    </th>
  );
}

// Gestionnaire de tri
const handleSort = (field) => {
  if (sortField === field) {
    // Inverser la direction si on reclique la même colonne
    setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
  } else {
    setSortField(field);
    setSortDirection('desc'); // Toujours commencer par DESC pour les coûts
  }
};

// Dans le <thead>
<tr>
  <th className="px-6 py-4">Rang</th>
  <SortableHeader label="Équipement" field="name"
    sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
  <SortableHeader label="Coût Fixe (GLPI)" field="totalFixedCost"
    sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
  <SortableHeader label="Super Coût (SQLite)" field="totalSuperCost"
    sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
  <SortableHeader label="Coût Total ↕" field="grandTotalCost"
    sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
</tr>
```

---

## 3. Indicateur de Rang (Podium)

```jsx
// Affichage du rang dans la première colonne
{sortedAssets.map((asset, index) => {
  const rank = index + 1;

  // Médailles pour le podium (uniquement si tri par coût décroissant)
  const medal = sortField === 'grandTotalCost' && sortDirection === 'desc'
    ? ['🥇', '🥈', '🥉'][index] || null
    : null;

  // Style de la ligne selon le rang
  const rowClass = rank === 1 && sortDirection === 'desc'
    ? 'bg-amber-50/60 border-l-4 border-amber-400'     // 1er : or
    : rank === 2 && sortDirection === 'desc'
    ? 'bg-neutral-50/60 border-l-4 border-neutral-400' // 2ème : argent
    : rank === 3 && sortDirection === 'desc'
    ? 'bg-orange-50/60 border-l-4 border-orange-400'   // 3ème : bronze
    : '';

  return (
    <tr key={`${asset.itemtype}-${asset.id}`}
        className={`hover:bg-neutral-50 transition-colors ${rowClass}`}>

      <td className="px-6 py-4 text-center">
        {medal ? (
          <span className="text-xl">{medal}</span>
        ) : (
          <span className="text-sm text-neutral-400 font-mono">#{rank}</span>
        )}
      </td>
      {/* ... autres colonnes ... */}
    </tr>
  );
})}
```

---

## 4. Sélecteur Top N

```jsx
// Barre de contrôle au-dessus du tableau
<div className="flex flex-wrap gap-3 items-center">
  <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">
    Afficher :
  </span>

  {[null, 5, 10, 20].map(n => (
    <button
      key={n}
      onClick={() => setTopN(n)}
      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
        topN === n
          ? 'bg-black text-white border-black'
          : 'bg-white text-neutral-600 border-neutral-300 hover:border-neutral-600'
      }`}
    >
      {n === null ? 'Tous' : `Top ${n}`}
    </button>
  ))}

  {/* Raccourcis rapides */}
  <div className="ml-auto flex gap-2">
    <button
      onClick={() => { setSortField('grandTotalCost'); setSortDirection('desc'); setTopN(5); }}
      className="text-xs px-3 py-1.5 rounded-full bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 font-medium"
    >
      🔺 5 Plus Coûteux
    </button>
    <button
      onClick={() => { setSortField('grandTotalCost'); setSortDirection('asc'); setTopN(5); }}
      className="text-xs px-3 py-1.5 rounded-full bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 font-medium"
    >
      🔻 5 Moins Coûteux
    </button>
  </div>
</div>
```

---

## 5. Vue Comparative — Les 5 Plus Chers vs Les 5 Moins Chers

```javascript
// Calcul des deux extrêmes en dehors du tableau principal
const top5Expensive = useMemo(() => {
  return [...processedAssets]
    .filter(a => a.grandTotalCost > 0)
    .sort((a, b) => b.grandTotalCost - a.grandTotalCost)
    .slice(0, 5);
}, [processedAssets]);

const top5Cheapest = useMemo(() => {
  return [...processedAssets]
    .filter(a => a.grandTotalCost > 0) // uniquement ceux qui ont des coûts
    .sort((a, b) => a.grandTotalCost - b.grandTotalCost)
    .slice(0, 5);
}, [processedAssets]);
```

```jsx
{/* Vue comparative en deux colonnes */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">

  {/* Les 5 plus coûteux */}
  <div className="bg-white rounded-xl border border-red-100 p-5">
    <h3 className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
      <span>🔺</span> Top 5 Équipements les Plus Coûteux
    </h3>
    <ol className="space-y-2">
      {top5Expensive.map((asset, i) => (
        <li key={asset.id}
            className="flex justify-between items-center text-sm py-1.5 border-b border-neutral-50">
          <div className="flex items-center gap-2">
            <span className="text-lg">{['🥇','🥈','🥉','4️⃣','5️⃣'][i]}</span>
            <span className="text-neutral-700 font-medium">{asset.name}</span>
          </div>
          <span className="font-bold text-red-600">
            {asset.grandTotalCost.toFixed(2)} €
          </span>
        </li>
      ))}
    </ol>
  </div>

  {/* Les 5 moins coûteux */}
  <div className="bg-white rounded-xl border border-green-100 p-5">
    <h3 className="text-sm font-bold text-green-700 mb-3 flex items-center gap-2">
      <span>🔻</span> Top 5 Équipements les Moins Coûteux
    </h3>
    <ol className="space-y-2">
      {top5Cheapest.map((asset, i) => (
        <li key={asset.id}
            className="flex justify-between items-center text-sm py-1.5 border-b border-neutral-50">
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400 font-mono w-4">#{i + 1}</span>
            <span className="text-neutral-700 font-medium">{asset.name}</span>
          </div>
          <span className="font-bold text-green-600">
            {asset.grandTotalCost.toFixed(2)} €
          </span>
        </li>
      ))}
    </ol>
  </div>
</div>
```

---

## 6. Résultat Visuel

### Tableau principal trié (Tri par Coût Total décroissant — Top 5)

```
Rang | Équipement       | Type     | Coût Fixe  | Super Coût | Coût Total ▼
─────┼──────────────────┼──────────┼────────────┼────────────┼─────────────
🥇   | PC-ADM-001       | Computer | 159.00 €   | 75.00 €    | 234.00 €
🥈   | Printer-01       | Printer  | 50.00 €    | 30.00 €    | 80.00 €
🥉   | Laptop-02        | Computer | 45.00 €    | 0.00 €     | 45.00 €
#4   | Monitor-01       | Monitor  | 20.00 €    | 0.00 €     | 20.00 €
#5   | Switch-Reseau-01 | Network  | 5.00 €     | 0.00 €     | 5.00 €
```

### Vue comparative

```
🔺 Top 5 Plus Coûteux         |  🔻 Top 5 Moins Coûteux
─────────────────────────     |  ─────────────────────────────
🥇 PC-ADM-001     234.00 €    |  #1 Switch-Reseau-01   5.00 €
🥈 Printer-01      80.00 €    |  #2 Monitor-01        20.00 €
🥉 Laptop-02       45.00 €    |  #3 Laptop-02         45.00 €
4️⃣  Monitor-01      20.00 €    |  #4 Printer-01        80.00 €
5️⃣  Switch-Reseau-01  5.00 €   |  #5 PC-ADM-001       234.00 €
```

---

## 7. Récapitulatif des États React

| State | Type | Rôle |
|---|---|---|
| `sortField` | `string` | Colonne active (`grandTotalCost`, `totalFixedCost`, `name`…) |
| `sortDirection` | `'asc' \| 'desc'` | Sens du tri |
| `topN` | `number \| null` | Limiter à N résultats (`null` = tous) |
| `sortedAssets` | `array` (useMemo) | Résultat trié et limité |
| `top5Expensive` | `array` (useMemo) | 5 plus coûteux — vue comparative |
| `top5Cheapest` | `array` (useMemo) | 5 moins coûteux — vue comparative |

> [!TIP]
> Le tri est entièrement **côté client** (`useMemo`) — aucune requête supplémentaire vers GLPI ou SQLite. Les données sont déjà chargées dans `processedAssets`.

> [!NOTE]
> Le filtre Top N s'applique **après** le tri, ce qui garantit que "Top 5" retourne toujours les 5 premiers éléments du tri actif (qu'il soit par coût, par nom, etc.).
