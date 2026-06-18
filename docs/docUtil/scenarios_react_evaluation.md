# Scénarios Pratiques d'Évaluation — React Frontend (Examen)

Ce guide regroupe des scénarios avancés et fréquents en React à mémoriser pour l'examen pratique (sans IA). Ces implémentations sont conçues pour être **propres, modulaires et faciles à reproduire**.

---

## 💡 Sommaire des Scénarios React
1. **Scénario A : Pagination Côté Client** — Découper une liste d'éléments (ex: tickets) en pages avec contrôles Précédent/Suivant.
2. **Scénario B : Multisélection et Actions Groupées** — Sélectionner plusieurs tickets pour appliquer un traitement en lot (ex: suppression).
3. **Scénario C : Input d'Autocomplétion (Typeahead)** — Une barre de recherche avec liste déroulante filtrée dynamiquement.

---

## 🛠️ Scénario A : Pagination Côté Client (Client-side Pagination)

L'évaluateur demande : *"Ajoutez une pagination locale côté client pour la liste des tickets afin de n'afficher que 5 tickets par page, avec des boutons de navigation fonctionnels."*

```jsx
import React, { useState, useMemo } from 'react';

export default function PaginatedTicketList({ tickets }) {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // 1. Calculer le nombre total de pages
  const totalPages = Math.ceil(tickets.length / itemsPerPage);

  // 2. Découper les tickets pour la page courante (useMemo pour la performance)
  const paginatedTickets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return tickets.slice(startIndex, endIndex);
  }, [tickets, currentPage]);

  return (
    <div className="bg-white p-6 border border-neutral-200 rounded-lg max-w-xl font-sans">
      <h3 className="font-bold text-lg mb-4 text-black">Liste des Tickets</h3>
      
      {/* Rendu de la liste */}
      <ul className="divide-y divide-neutral-100 mb-6">
        {paginatedTickets.map(ticket => (
          <li key={ticket.id} className="py-3 flex justify-between items-center">
            <span className="text-sm font-medium text-neutral-800">{ticket.name}</span>
            <span className="text-xs font-mono text-neutral-400">#{ticket.id}</span>
          </li>
        ))}
      </ul>

      {/* Barre de navigation / Pagination */}
      <div className="flex justify-between items-center text-sm">
        <button 
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1.5 border border-neutral-300 rounded text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
        >
          Précédent
        </button>

        <span className="text-neutral-500 font-medium">
          Page {currentPage} sur {totalPages || 1}
        </span>

        <button 
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages || totalPages === 0}
          className="px-3 py-1.5 border border-neutral-300 rounded text-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-neutral-50 transition-colors"
        >
          Suivant
        </button>
      </div>
    </div>
  );
}
```

---

## 🛠️ Scénario B : Multisélection et Actions Groupées (Bulk Actions)

L'évaluateur demande : *"Ajoutez des cases à cocher devant chaque ticket. Permettez de sélectionner un ou plusieurs tickets, d'avoir un bouton 'Tout sélectionner' et d'exécuter un bouton de suppression groupée lorsque des éléments sont cochés."*

```jsx
import React, { useState } from 'react';

export default function BulkActionList({ initialTickets, onDeleteGroup }) {
  const [tickets, setTickets] = useState(initialTickets);
  const [selectedIds, setSelectedIds] = useState([]);

  // 1. Gérer la sélection individuelle
  const handleSelectToggle = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // 2. Gérer la sélection globale (Tout cocher / décocher)
  const handleSelectAllToggle = () => {
    if (selectedIds.length === tickets.length) {
      setSelectedIds([]); // Décocher tout
    } else {
      setSelectedIds(tickets.map(t => t.id)); // Cocher tout
    }
  };

  // 3. Exécuter l'action groupée
  const handleBulkDelete = async () => {
    if (window.confirm(`Voulez-vous supprimer les ${selectedIds.length} tickets sélectionnés ?`)) {
      // Exécuter l'API de suppression pour chaque ID sélectionné
      await Promise.all(selectedIds.map(id => 
        fetch(`http://localhost:8081/api/tickets/${id}`, { method: 'DELETE' })
      ));
      
      // Mettre à jour l'état local
      setTickets(prev => prev.filter(t => !selectedIds.includes(t.id)));
      setSelectedIds([]); // Vider la sélection
      alert("Tickets supprimés avec succès !");
    }
  };

  return (
    <div className="bg-white p-6 border border-neutral-200 rounded-lg max-w-xl font-sans text-black">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Sélection Groupée</h3>
        
        {/* Afficher l'action groupée si au moins un ticket est sélectionné */}
        {selectedIds.length > 0 && (
          <button 
            onClick={handleBulkDelete}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
          >
            Supprimer ({selectedIds.length})
          </button>
        )}
      </div>

      <table className="w-full text-left text-sm divide-y divide-neutral-200">
        <thead>
          <tr className="bg-neutral-50">
            <th className="p-3 w-10">
              <input 
                type="checkbox" 
                checked={tickets.length > 0 && selectedIds.length === tickets.length}
                onChange={handleSelectAllToggle}
              />
            </th>
            <th className="p-3 font-semibold text-neutral-600">ID</th>
            <th className="p-3 font-semibold text-neutral-600">Ticket</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {tickets.map(ticket => (
            <tr key={ticket.id} className="hover:bg-neutral-50 transition-colors">
              <td className="p-3">
                <input 
                  type="checkbox" 
                  checked={selectedIds.includes(ticket.id)}
                  onChange={() => handleSelectToggle(ticket.id)}
                />
              </td>
              <td className="p-3 font-mono text-neutral-500">#{ticket.id}</td>
              <td className="p-3 font-medium">{ticket.name}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

## 🛠️ Scénario C : Input d'Autocomplétion (Typeahead/Autocomplete)

L'évaluateur demande : *"Créez un champ de saisie d'autocomplétion. Lorsque l'utilisateur saisit un équipement (matériel), le champ doit filtrer les correspondances et afficher une liste déroulante interactive. L'utilisateur peut cliquer sur un élément pour le sélectionner."*

```jsx
import React, { useState, useEffect, useRef } from 'react';

export default function AutocompleteSelector({ onSelect }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef(null);

  // Simulation de chargement d'éléments depuis SQLite / GLPI
  const allEquipments = [
    { id: 101, name: 'Ordinateur Portable Dell Latitude' },
    { id: 102, name: 'Serveur HP ProLiant' },
    { id: 103, name: 'Switch Cisco 24 Ports' },
    { id: 104, name: 'Moniteur Samsung 27 pouces' },
    { id: 105, name: 'Téléphone IP Yealink' }
  ];

  // Filtrer les suggestions au fur et à mesure de la saisie
  useEffect(() => {
    if (query.trim() === '') {
      setSuggestions([]);
      return;
    }
    const filtered = allEquipments.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase())
    );
    setSuggestions(filtered);
  }, [query]);

  // Fermer la liste si l'utilisateur clique en dehors du composant
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOption = (item) => {
    setQuery(item.name);
    setShowDropdown(false);
    onSelect(item); // Callback parent
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm font-sans text-black">
      <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1">
        Rechercher un Équipement
      </label>
      
      <input 
        type="text" 
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => setShowDropdown(true)}
        placeholder="Saisir un matériel..." 
        className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
      />

      {/* Liste déroulante des suggestions */}
      {showDropdown && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 mt-1 bg-white border border-neutral-200 rounded shadow-lg z-50 divide-y divide-neutral-100 max-h-48 overflow-y-auto">
          {suggestions.map(item => (
            <li 
              key={item.id}
              onClick={() => handleSelectOption(item)}
              className="px-3 py-2 text-sm hover:bg-neutral-50 cursor-pointer transition-colors flex justify-between items-center"
            >
              <span>{item.name}</span>
              <span className="text-xs text-neutral-400 font-mono">ID: {item.id}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Rendu si aucun résultat */}
      {showDropdown && query && suggestions.length === 0 && (
        <div className="absolute left-0 right-0 mt-1 bg-white border border-neutral-200 rounded shadow-lg p-3 text-sm text-neutral-400 italic">
          Aucun équipement correspondant.
        </div>
      )}
    </div>
  );
}
```
