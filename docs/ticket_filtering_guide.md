# Guide d'implémentation — Filtres de Tickets (Type, Priorité, Urgence, Impact)

Ce guide décrit comment ajouter des filtres dynamiques à la liste des tickets (`TicketList.jsx`) sans modifier directement le code existant en phase de production. Il propose une fonction pure de filtrage et l'intégration du composant de filtrage.

---

## 1. Fonction de Filtrage des Tickets (Utility Helper)

Cette fonction prend la liste complète des tickets et retourne uniquement ceux qui correspondent aux filtres actifs.

```javascript
/**
 * Filtre une liste de tickets selon le Type, la Priorité, l'Urgence et l'Impact.
 * @param {Array} tickets - Liste brute des tickets GLPI
 * @param {Object} filters - Objet de filtres { type, priority, urgency, impact }
 * @returns {Array} Liste des tickets filtrés
 */
export const filterTickets = (tickets = [], filters = {}) => {
  return tickets.filter(ticket => {
    // 1. Filtre par Type (1 = Incident, 2 = Demande)
    if (filters.type && String(ticket.type) !== String(filters.type)) {
      return false;
    }

    // 2. Filtre par Priorité (1 à 6)
    if (filters.priority) {
      const priorityVal = ticket.priority?.id || ticket.priority;
      if (String(priorityVal) !== String(filters.priority)) {
        return false;
      }
    }

    // 3. Filtre par Urgence (1 à 5)
    if (filters.urgency) {
      const urgencyVal = ticket.urgency?.id || ticket.urgency;
      if (String(urgencyVal) !== String(filters.urgency)) {
        return false;
      }
    }

    // 4. Filtre par Impact (1 à 5)
    if (filters.impact) {
      const impactVal = ticket.impact?.id || ticket.impact;
      if (String(impactVal) !== String(filters.impact)) {
        return false;
      }
    }

    return true;
  });
};
```

---

## 2. Guide d'Intégration pas-à-pas (dans `TicketList.jsx`)

Si vous décidez d'intégrer ces filtres ultérieurement, voici les modifications à apporter dans [TicketList.jsx](file:///d:/shania/itu/L3/glpi/deskflow/src/components/ticket/TicketList.jsx) :

### Étape A : Importer `Select`
Ajouter `Select` aux imports de templates en haut du fichier :
```javascript
import {
  H1, P, Button, Table, Th, Tr, Td, Badge, Alert, Spinner, Divider, Card, Select
} from '../templates';
```

### Étape B : Déclarer l'état des filtres
Sous la déclaration de `currentPage`, ajoutez l'état initial des filtres :
```javascript
const [filters, setFilters] = useState({
  type: '',
  priority: '',
  urgency: '',
  impact: ''
});

const handleFilterChange = (e) => {
  const { name, value } = e.target;
  setFilters(prev => ({ ...prev, [name]: value }));
  setCurrentPage(1); // Retourner à la page 1 lors d'un filtrage
};
```

### Étape C : Appliquer le filtrage avant la pagination
Remplacez la logique originale de `currentTickets` :

**Ancien code :**
```javascript
const totalPages = Math.ceil(tickets.length / itemsPerPage) || 1;
const activePage = Math.min(currentPage, totalPages);
const currentTickets = tickets.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);
```

**Nouveau code :**
```javascript
const filteredTickets = filterTickets(tickets, filters);
const totalPages = Math.ceil(filteredTickets.length / itemsPerPage) || 1;
const activePage = Math.min(currentPage, totalPages);
const currentTickets = filteredTickets.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);
```

### Étape D : Rendre la barre de filtres UI
Insérez ce bloc de formulaire juste au-dessus du tableau `<Table>` dans le code JSX :

```jsx
{/* Barre de Filtres */}
<div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-4 text-black mb-6">
  <div>
    <label className="block text-xs font-bold uppercase text-neutral-400 mb-1.5 font-sans">Type</label>
    <Select name="type" value={filters.type} onChange={handleFilterChange}>
      <option value="">Tous les types</option>
      <option value="1">Incident</option>
      <option value="2">Demande</option>
    </Select>
  </div>

  <div>
    <label className="block text-xs font-bold uppercase text-neutral-400 mb-1.5 font-sans">Priorité</label>
    <Select name="priority" value={filters.priority} onChange={handleFilterChange}>
      <option value="">Toutes les priorités</option>
      <option value="1">Très basse</option>
      <option value="2">Basse</option>
      <option value="3">Moyenne</option>
      <option value="4">Haute</option>
      <option value="5">Très haute</option>
      <option value="6">Majeure</option>
    </Select>
  </div>

  <div>
    <label className="block text-xs font-bold uppercase text-neutral-400 mb-1.5 font-sans">Urgence</label>
    <Select name="urgency" value={filters.urgency} onChange={handleFilterChange}>
      <option value="">Toutes les urgences</option>
      <option value="1">Très basse</option>
      <option value="2">Basse</option>
      <option value="3">Moyenne</option>
      <option value="4">Haute</option>
      <option value="5">Très haute</option>
    </Select>
  </div>

  <div>
    <label className="block text-xs font-bold uppercase text-neutral-400 mb-1.5 font-sans">Impact</label>
    <Select name="impact" value={filters.impact} onChange={handleFilterChange}>
      <option value="">Tous les impacts</option>
      <option value="1">Très bas</option>
      <option value="2">Bas</option>
      <option value="3">Moyen</option>
      <option value="4">Haut</option>
      <option value="5">Très haut</option>
    </Select>
  </div>
</div>
```
