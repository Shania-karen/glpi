# Guide des Fonctions Utilitaires — GLPI & Deskflow

Ce guide regroupe les fonctions utilitaires indispensables pour manipuler l'API REST de GLPI de façon propre et homogène dans l'application, en gérant les particularités d'expand des dropdowns et les formats de données.

---

## 1. `extractValue` (Extraction Robuste de Données)

### Rôle
L'API GLPI retourne les champs liés (dropdowns) sous différentes formes selon les requêtes : un simple ID numérique (`8`), un objet `{ id: 8, name: "HP" }`, ou un tableau d'objets. Cette fonction unifie la récupération pour toujours obtenir la valeur textuelle la plus pertinente.

### Code
```javascript
export const extractValue = (field) => {
  if (field === null || field === undefined || field === '' || field === 0 || field === '0') return null;
  if (Array.isArray(field)) {
    if (field.length === 0) return null;
    return field.map(f => f.completename || f.name || f.value || f.id).join(', ') || null;
  }
  if (typeof field === 'object') {
    return field.completename || field.name || field.value || field.id || null;
  }
  return String(field);
};
```

### Pages Concernées
- **Toutes les fiches d'équipements** (ex: `AssetList.jsx`, `ElementDetailSheet.jsx`).
- **Le Dashboard** pour l'affichage propre des colonnes de données.

---

## 2. `getModelName` & `getTypeName` (Résolution Dynamique de Types et Modèles)

### Rôle
Chaque type d'équipement GLPI possède des clés de propriétés distinctes (ex: `computermodels_id` pour un Computer, `monitormodels_id` pour un Monitor). Ces fonctions parcourent récursivement les clés de l'objet pour trouver le bon modèle ou type sans devoir coder un `switch` par équipement.

### Code
```javascript
export const getModelName = (item) => {
  if (!item) return '-';
  if (item.model) {
    const val = extractValue(item.model);
    if (val) return val;
  }
  if (item.models_id) {
    const val = extractValue(item.models_id);
    if (val) return val;
  }
  for (const key of Object.keys(item)) {
    if (key.endsWith('models_id')) {
      const val = extractValue(item[key]);
      if (val) return val;
    }
  }
  return '-';
};

export const getTypeName = (item) => {
  if (!item) return '-';
  if (item.type) {
    const val = extractValue(item.type);
    if (val) return val;
  }
  for (const key of Object.keys(item)) {
    if (key.endsWith('types_id')) {
      const val = extractValue(item[key]);
      if (val) return val;
    }
  }
  return item._itemtype || '-';
};
```

### Pages Concernées
- **Affichages d'équipements** (`AssetList.jsx`, `Detail.jsx`).

---

## 3. `formatDuration` (Conversion des temps en secondes)

### Rôle
GLPI stocke les durées d'action (`actiontime`) sous forme de secondes (ex: `5400` pour 1h30). Cette fonction formate la durée en une chaîne lisible en français.

### Code
```javascript
export const formatDuration = (seconds) => {
  const sec = parseInt(seconds, 10);
  if (isNaN(sec) || sec <= 0) return 'Non défini';
  
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  
  if (h > 0) {
    return `${h}h ${m > 0 ? `${m}min` : ''}`;
  }
  return `${m}min`;
};
```

### Pages Concernées
- **Statistiques de ticket** dans `TicketDetailView.jsx`.
- **Ligne de tâches** du fil du ticket.
- **Rapports de temps** du Dashboard.

---

## 4. `getStatusLabel` & `getStatusBadgeVariant` (Gestion des Statuts GLPI)

### Rôle
L'API GLPI retourne le statut du ticket sous forme d'un entier de 1 à 6. Ces fonctions traduisent le code en français et associent le style de Badge correspondant.

### Code
```javascript
export const getStatusLabel = (status) => {
  const s = parseInt(status?.id || status, 10);
  switch (s) {
    case 1: return 'Nouveau';
    case 2: return 'En cours (assigné)';
    case 3: return 'Planifié';
    case 4: return 'En attente';
    case 5: return 'Résolu';
    case 6: return 'Clos';
    default: return 'Inconnu';
  }
};

export const getStatusBadgeVariant = (status) => {
  const s = parseInt(status?.id || status, 10);
  switch (s) {
    case 1: return 'danger';    // Rouge/Nouveau
    case 2: return 'info';      // Bleu/En cours
    case 3: return 'warning';   // Orange/Planifié
    case 4: return 'secondary'; // Gris/En attente
    case 5: return 'success';   // Vert/Résolu
    case 6: return 'dark';      // Noir/Clos
    default: return 'secondary';
  }
};
```

### Pages Concernées
- **Liste des tickets** (`TicketList.jsx`).
- **Fiche détail de ticket** (`TicketDetailView.jsx`).

---

## 5. `formatCurrency` (Formatage Financier Uniforme)

### Rôle
Garantit que tous les coûts fixes et horaires sont affichés avec le symbole de l'Euro, des espaces insécables et exactement 2 décimales.

### Code
```javascript
export const formatCurrency = (amount) => {
  const val = parseFloat(String(amount).replace(',', '.'));
  if (isNaN(val)) return '0,00 €';
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(val);
};
```

### Pages Concernées
- **Dashboard financier** (`Dashboard.jsx`).
- **Coûts détaillés des tickets** (`TicketDetailView.jsx`).

---

## 💡 Comment les centraliser ?

Pour éviter de dupliquer ces codes dans chaque fichier, créez un fichier d'utilitaires dans votre structure :
1. Créez un fichier `src/services/glpiUtils.js` et collez-y ces fonctions avec le mot-clé `export`.
2. Importez-les simplement dans vos composants :
   ```javascript
   import { extractValue, formatCurrency, getStatusLabel } from '../../services/glpiUtils';
   ```
