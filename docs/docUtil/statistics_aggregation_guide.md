# Guide d'implémentation — Statistiques Avancées (Équipements & Techniciens)

Ce guide fournit les algorithmes JavaScript et exemples d'affichage UI pour extraire et présenter :
1. Les **équipements ayant le plus de tickets** (matériels problématiques).
2. Le **classement des techniciens** (le plus de tickets assignés vs le moins de tickets assignés) pour équilibrer la charge de travail.

---

## 1. Algorithmes d'Agrégation (JavaScript)

Ces fonctions traitent la liste brute des tickets et de leurs liaisons pour générer les classements.

### 1.1. Classement des Équipements par Nombre de Tickets
Cette fonction compte le nombre de tickets liés à chaque équipement unique.

```javascript
/**
 * Calcule et trie les équipements par le nombre de tickets associés.
 * @param {Array} tickets - Liste des tickets avec leurs elements liés (linkedItems)
 */
export const getAssetsByTicketCount = (tickets = []) => {
  const assetCounts = {}; // { "Computer_23": { id, type, name, count } }

  tickets.forEach(ticket => {
    const linked = ticket.linkedItems || [];
    linked.forEach(item => {
      const key = `${item.itemtype}_${item.items_id}`;
      if (!assetCounts[key]) {
        assetCounts[key] = {
          id: item.items_id,
          type: item.itemtype,
          name: item.name || `${item.itemtype} #${item.items_id}`,
          count: 0
        };
      }
      assetCounts[key].count += 1;
    });
  });

  // Convertit en tableau et trie par ordre décroissant (le plus de tickets en premier)
  return Object.values(assetCounts).sort((a, b) => b.count - a.count);
};
```

---

### 1.2. Classement des Techniciens (Charge de Travail)
Cette fonction identifie les techniciens assignés aux tickets, compte leurs tickets actifs, et fournit le classement complet (du plus surchargé au plus disponible).

```javascript
/**
 * Analyse la charge de travail des techniciens.
 * @param {Array} tickets - Liste des tickets
 * @param {Array} allTechnicians - Liste complète des techniciens/utilisateurs pour inclure ceux à 0 ticket
 */
export const getTechnicianWorkload = (tickets = [], allTechnicians = []) => {
  const workload = {}; // { techId: { id, name, count } }

  // Initialise tous les techniciens connus à 0 ticket
  allTechnicians.forEach(tech => {
    workload[tech.id] = {
      id: tech.id,
      name: tech.username || `${tech.firstname} ${tech.realname}`,
      count: 0
    };
  });

  // Parcourt les tickets pour incrémenter le compteur du technicien assigné
  tickets.forEach(ticket => {
    // Recherche du technicien dans l'équipe (role = 'assigned' ou clé direct users_id_tech / _users_id_assign)
    const assignedTech = ticket.team?.find(member => member.role === 'assigned') || ticket.users_id_tech;
    const techId = assignedTech?.id || assignedTech;

    if (techId && workload[techId]) {
      workload[techId].count += 1;
    }
  });

  // Trie les techniciens par ordre décroissant
  const sortedWorkload = Object.values(workload).sort((a, b) => b.count - a.count);

  return {
    sortedWorkload,
    mostAssigned: sortedWorkload[0] || null, // Le plus de tickets assignés
    leastAssigned: sortedWorkload[sortedWorkload.length - 1] || null // Le moins de tickets assignés (ou le plus disponible)
  };
};
```

---

## 2. Composants UI (Rendu Visuel Premium)

Voici des exemples de composants d'affichage en noir et blanc respectant le style minimaliste de l'application.

### 2.1. Tableau des Équipements Problématiques

```jsx
import { getAssetsByTicketCount } from '../../services/statsService';

export function TopProblematicAssets({ tickets }) {
  const topAssets = getAssetsByTicketCount(tickets).slice(0, 5); // Affiche le Top 5

  return (
    <div className="border border-neutral-200 rounded-xl p-6 bg-white shadow-sm">
      <h3 className="font-bold text-neutral-900 mb-4 text-base">Top 5 Équipements les plus sollicités (Incidents)</h3>
      <div className="space-y-3">
        {topAssets.length > 0 ? (
          topAssets.map((asset, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg border border-neutral-100 text-sm">
              <div>
                <span className="font-medium text-black block">{asset.name}</span>
                <span className="text-xs text-neutral-400 uppercase tracking-wider">{asset.type} — ID: {asset.id}</span>
              </div>
              <span className="font-mono font-bold text-sm bg-neutral-900 text-white px-2.5 py-1 rounded-md">
                {asset.count} {asset.count > 1 ? 'tickets' : 'ticket'}
              </span>
            </div>
          ))
        ) : (
          <p className="text-neutral-400 italic text-sm">Aucun équipement lié à des tickets.</p>
        )}
      </div>
    </div>
  );
}
```

---

### 2.2. Panel d'Équilibrage de Charge des Techniciens

```jsx
import { getTechnicianWorkload } from '../../services/statsService';

export function TechnicianWorkloadDashboard({ tickets, technicians }) {
  const { mostAssigned, leastAssigned, sortedWorkload } = getTechnicianWorkload(tickets, technicians);

  return (
    <div className="border border-neutral-200 rounded-xl p-6 bg-white shadow-sm space-y-6">
      <h3 className="font-bold text-neutral-900 text-base">Répartition de la charge Techniciens</h3>
      
      {/* KPI de charge extrême */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Le plus assigné */}
        {mostAssigned && (
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50 flex items-center justify-between">
            <div>
              <span className="text-neutral-400 text-xs font-bold uppercase tracking-wider block">Technicien le plus sollicité</span>
              <span className="font-semibold text-black mt-1 block">{mostAssigned.name}</span>
            </div>
            <span className="font-mono text-xl font-extrabold text-neutral-900">{mostAssigned.count} tkt.</span>
          </div>
        )}

        {/* Le moins assigné */}
        {leastAssigned && (
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-900 text-white flex items-center justify-between">
            <div>
              <span className="text-neutral-400 text-xs font-bold uppercase tracking-wider block">Technicien le plus disponible</span>
              <span className="font-semibold text-white mt-1 block">{leastAssigned.name}</span>
            </div>
            <span className="font-mono text-xl font-extrabold text-white">{leastAssigned.count} tkt.</span>
          </div>
        )}
      </div>

      {/* Classement complet */}
      <div className="space-y-2 pt-2 border-t border-neutral-100">
        <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-3">Classement des Techniciens</h4>
        {sortedWorkload.map((tech, index) => (
          <div key={tech.id} className="flex items-center justify-between text-sm py-1.5 border-b border-neutral-50 last:border-0">
            <span className="text-neutral-700 font-medium">{index + 1}. {tech.name}</span>
            <span className="font-mono font-semibold text-neutral-500">{tech.count} tickets actifs</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 3. Pages Cibles pour l'Intégration
- **`Dashboard.jsx`** : Il est recommandé de placer ces deux composants sous forme de grille à deux colonnes directement sous les graphiques financiers pour offrir une vue décisionnelle opérationnelle complète.
