# Fiche de Référence Rapide (Cheatsheet) : React

Cette fiche regroupe les structures de code React les plus courantes à connaître par cœur pour l'évaluation. Elle est optimisée pour être simple à mémoriser et rapide à écrire.

---

## 1. Gestion des Formulaires et Saisies (Controlled Inputs)

Plutôt que d'écrire une fonction de gestion pour chaque champ, utilisez une fonction unique basée sur l'attribut `name` des champs HTML.

```jsx
import React, { useState } from 'react';

export default function MyForm() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '1',     // Valeur par défaut pour un select
    isActive: false    // Valeur par défaut pour une checkbox
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Données soumises :", formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Input Texte */}
      <input 
        name="title" 
        value={formData.title} 
        onChange={handleChange} 
        placeholder="Titre" 
      />

      {/* Textarea */}
      <textarea 
        name="description" 
        value={formData.description} 
        onChange={handleChange} 
      />

      {/* Select Dropdown */}
      <select name="category" value={formData.category} onChange={handleChange}>
        <option value="1">Incident</option>
        <option value="2">Demande</option>
      </select>

      {/* Checkbox */}
      <label>
        <input 
          type="checkbox" 
          name="isActive" 
          checked={formData.isActive} 
          onChange={handleChange} 
        />
        Activer
      </label>

      <button type="submit">Envoyer</button>
    </form>
  );
}
```

---

## 2. Chargement de Données API (GET) dans un Composant

Modèle type pour charger des données depuis une API au montage du composant avec gestion des états d'attente (loading) et d'erreur.

```jsx
import React, { useState, useEffect } from 'react';

export function DataFetcher() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:8081/api/colors');
      if (!response.ok) throw new Error('Erreur HTTP ' + response.status);
      const data = await response.json();
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // [] signifie que l'effet s'exécute uniquement AU PREMIER MONTAGE
  useEffect(() => {
    loadData();
  }, []);

  if (loading) return <div>Chargement...</div>;
  if (error) return <div className="text-red-500">Erreur : {error}</div>;

  return (
    <ul>
      {items.map(item => (
        <li key={item.id}>{item.name}</li>
      ))}
    </ul>
  );
}
```

---

## 3. Envoi de Données API (POST, PUT, DELETE)

Modèle minimal pour envoyer, modifier ou supprimer des ressources.

```javascript
// A. Requête POST (Création)
const handleCreate = async (newData) => {
  const res = await fetch('http://localhost:8081/api/colors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newData)
  });
  if (res.ok) {
    const createdItem = await res.json();
    // Action de mise à jour locale
  }
};

// B. Requête PUT (Modification complète)
const handleUpdate = async (id, updatedData) => {
  const res = await fetch(`http://localhost:8081/api/colors/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedData)
  });
};

// C. Requête DELETE (Suppression)
const handleDelete = async (id) => {
  const res = await fetch(`http://localhost:8081/api/colors/${id}`, {
    method: 'DELETE'
  });
  if (res.ok) {
    // Supprimer localement du state React
    setItems(prev => prev.filter(item => item.id !== id));
  }
};
```

---

## 4. Filtrage Dynamique Local de Données (Performance avec `useMemo`)

Pour filtrer une liste de données à la volée sans déclencher des appels réseaux inutiles.

```jsx
import React, { useState, useMemo } from 'react';

export function FilteredList({ tickets }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      // 1. Filtre par recherche textuelle (titre)
      const matchesSearch = ticket.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // 2. Filtre par sélection de statut
      const matchesStatus = selectedStatus === 'all' || String(ticket.status) === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [tickets, searchTerm, selectedStatus]); // Recalculer uniquement si l'un de ces éléments change

  return (
    <div>
      <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Rechercher..." />
      <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
        <option value="all">Tous</option>
        <option value="1">Nouveau</option>
        <option value="2">En cours</option>
      </select>

      <ul>
        {filteredTickets.map(t => <li key={t.id}>{t.name}</li>)}
      </ul>
    </div>
  );
}
```

---

## 5. Communication Enfant ➔ Parent (Props Callbacks)

Pour fermer une modale ou recharger les données du parent depuis un composant enfant (ex: Fiche de détails).

```jsx
// COMPOSANT ENFANT (Fiche ou Modale)
export function MyModal({ isOpen, onClose, onRefresh }) {
  if (!isOpen) return null;

  const handleAction = async () => {
    // ... fait un traitement API ...
    onRefresh(); // Appelle la fonction passée par le parent pour recharger ses données
    onClose();   // Appelle la fonction passée par le parent pour se fermer
  };

  return (
    <div className="modal">
      <button onClick={handleAction}>Valider</button>
      <button onClick={onClose}>Annuler</button>
    </div>
  );
}

// COMPOSANT PARENT
export function ParentScreen() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const reloadData = () => {
    console.log("Données du parent rechargées !");
  };

  return (
    <div>
      <button onClick={() => setIsModalOpen(true)}>Ouvrir</button>
      <MyModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onRefresh={reloadData} 
      />
    </div>
  );
}
```
