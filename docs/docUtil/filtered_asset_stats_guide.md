# Guide d'implémentation — Tableau de bord filtré des Équipements par Statut de Ticket

Ce guide montre comment créer une vue statistique interactive permettant de filtrer les équipements selon le statut de leurs tickets (Résolus, Clos, En attente), avec un tableau affichant : **Nombre de tickets**, **Nom de l'élément**, et **Modèle**.

---

## 1. Algorithme d'Agrégation Filtrée (JavaScript)

Cette fonction prend la liste complète des tickets, applique le filtre de statut choisi, puis comptabilise les tickets reliés pour chaque équipement.

```javascript
import { getModelName } from './glpiUtils';

/**
 * Agrège les tickets reliés aux équipements en filtrant par le statut des tickets.
 * @param {Array} tickets - Liste brute de tous les tickets
 * @param {string|number|null} targetStatus - Statut cible (ex: 5 pour Résolu, 6 pour Clos, 4 pour En attente, ou null pour Tout)
 */
export const getFilteredAssetsStats = (tickets = [], targetStatus = null) => {
  const assetStats = {}; // { "itemtype_id": { name, model, count } }

  tickets.forEach(ticket => {
    // 1. Extraction du statut numérique du ticket
    const ticketStatus = parseInt(ticket.status?.id || ticket.status, 10);
    
    // 2. Application du filtre de statut s'il est spécifié
    if (targetStatus !== null && ticketStatus !== parseInt(targetStatus, 10)) {
      return; // Ignore le ticket s'il ne correspond pas au filtre
    }

    const linked = ticket.linkedItems || [];
    linked.forEach(item => {
      const key = `${item.itemtype}_${item.items_id}`;
      if (!assetStats[key]) {
        assetStats[key] = {
          name: item.name || `${item.itemtype} #${item.items_id}`,
          model: getModelName(item.detail || item),
          count: 0
        };
      }
      assetStats[key].count += 1;
    });
  });

  // Convertit en tableau et trie par le nombre de tickets décroissant
  return Object.values(assetStats).sort((a, b) => b.count - a.count);
};
```

---

## 2. Composant UI Interactif avec Filtre et Tableau (`FilteredAssetsTable.jsx`)

Ce composant React propose un sélecteur horizontal (boutons) pour basculer entre les statuts de tickets (En attente, Résolus, Clos, Tous) et affiche les équipements les plus touchés dans un tableau propre et minimaliste.

```jsx
import { useState, useMemo } from 'react';
import { getFilteredAssetsStats } from '../../services/statsService';
import { Table, Th, Tr, Td, Badge } from '../templates';

// Mappage des filtres de statut GLPI
const FILTERS = [
  { label: 'Tous les tickets', value: null },
  { label: 'En attente ⏳', value: 4 },
  { label: 'Résolus ✅', value: 5 },
  { label: 'Clos 🔒', value: 6 },
];

export default function FilteredAssetsTable({ tickets = [] }) {
  const [selectedStatus, setSelectedStatus] = useState(null);

  // Recalcul automatique lorsque les tickets ou le statut sélectionné changent
  const filteredData = useMemo(() => {
    return getFilteredAssetsStats(tickets, selectedStatus);
  }, [tickets, selectedStatus]);

  return (
    <div className="border border-neutral-200 rounded-xl p-6 bg-white shadow-sm space-y-6 text-black font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-neutral-900 text-base">Impact des incidents par équipement</h3>
          <p className="text-neutral-500 text-xs mt-0.5">Visualisez les équipements les plus sollicités par type de statut de ticket.</p>
        </div>

        {/* Boutons de filtres */}
        <div className="flex flex-wrap gap-1.5 bg-neutral-100 p-1 rounded-lg border border-neutral-200">
          {FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setSelectedStatus(f.value)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                selectedStatus === f.value
                  ? 'bg-white text-black shadow-sm'
                  : 'text-neutral-500 hover:text-black'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tableau des statistiques */}
      <div className="overflow-x-auto">
        <Table>
          <thead>
            <Tr>
              <Th className="w-32 text-center">Nombre de tickets</Th>
              <Th>Nom de l'élément</Th>
              <Th>Modèle</Th>
            </Tr>
          </thead>
          <tbody>
            {filteredData.length > 0 ? (
              filteredData.map((asset, idx) => (
                <Tr key={idx}>
                  <Td className="text-center font-mono font-bold text-sm bg-neutral-50 border-r border-neutral-100">
                    <Badge variant={selectedStatus === 5 ? 'success' : selectedStatus === 6 ? 'dark' : 'warning'}>
                      {asset.count} {asset.count > 1 ? 'tickets' : 'ticket'}
                    </Badge>
                  </Td>
                  <Td className="font-semibold text-neutral-900">{asset.name}</Td>
                  <Td className="text-neutral-500">{asset.model}</Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan="3" className="text-center py-8 text-neutral-400 italic">
                  Aucun équipement trouvé avec ces critères de tickets.
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
      </div>
    </div>
  );
}
```

---

## 3. Emplacement conseillé pour l'intégration
* **`Dashboard.jsx`** : Intégrez ce tableau dans la section d'analyse de la maintenance pour fournir aux administrateurs une vue claire sur les équipements dont les pannes ont été résolues (bon indicateur de maintenance), ceux dont les tickets sont encore en attente (points de blocage), et ceux dont les dossiers sont clos.
