# Fonctions Utilitaires — Logique Métier (GLPI Deskflow)

Ce document centralise les fonctions utilitaires réutilisables relatives à la logique métier de l'application (calculs financiers, formatage de données, validation de dates et correspondances avec les dictionnaires GLPI API).

---

## 1. Utilitaires Numériques et Financiers

Ces fonctions permettent d'assainir les entrées textuelles des CSV (souvent formatées avec des virgules pour les décimaux ou des espaces pour les milliers) et de calculer les coûts conformément aux règles de gestion.

### `sanitizeNumber`
Convertit une chaîne brute (ex: `"15,50"`, `"1 200"`) en un nombre flottant valide et propre.
```javascript
/**
 * Assainit et convertit une chaîne en nombre flottant.
 * @param {string|number} val - Valeur d'entrée
 * @returns {number} Nombre flottant assaini ou 0 si invalide
 */
export function sanitizeNumber(val) {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return val;
  const clean = String(val)
    .replace(/\s/g, '')     // Supprime les espaces (ex: séparateurs de milliers)
    .replace(',', '.');     // Remplace la virgule par un point pour les décimales
  const num = parseFloat(clean);
  return isNaN(num) ? 0 : num;
}
```

### `calculateTimeCost`
Calcule le coût horaire d'un ticket sur la base du temps passé (en secondes) et du taux horaire (€/heure).
```javascript
/**
 * Calcule le coût temporel d'une tâche ou d'un ticket.
 * @param {number} durationSeconds - Durée en secondes
 * @param {number} hourlyRate - Taux horaire de la ressource
 * @returns {number} Coût arrondi à 2 décimales
 */
export function calculateTimeCost(durationSeconds, hourlyRate) {
  const durationHours = sanitizeNumber(durationSeconds) / 3600;
  const rate = sanitizeNumber(hourlyRate);
  return Math.round((durationHours * rate) * 100) / 100;
}
```

### `sumTicketCosts`
Cumule l'ensemble des coûts (coût fixe et coût temporel calculé) d'un ticket ou d'un ensemble de coûts.
```javascript
/**
 * Calcule la somme globale des coûts financiers d'un ticket.
 * @param {Object} costObject - Objet de coûts { timeCost, fixedCost, durationSeconds }
 * @param {number} hourlyRate - Optionnel, taux horaire si non calculé dans timeCost
 * @returns {Object} Cumul financier { timeCostTotal, fixedCostTotal, grandTotal }
 */
export function sumTicketCosts(costObject, hourlyRate = 0) {
  const fixed = sanitizeNumber(costObject.fixedCost);
  let time = sanitizeNumber(costObject.timeCost);

  // Si le coût temporel n'est pas fourni directement mais qu'on a la durée et le taux
  if (time === 0 && costObject.durationSeconds && hourlyRate > 0) {
    time = calculateTimeCost(costObject.durationSeconds, hourlyRate);
  }

  return {
    timeCostTotal: time,
    fixedCostTotal: fixed,
    grandTotal: Math.round((time + fixed) * 100) / 100
  };
}
```

---

## 2. Utilitaires de Dates et Heures

Ces fonctions gèrent les validations de saisies de dates et effectuent les transformations requises pour stocker correctement les dates dans le format attendu par la base de données GLPI (MySQL standard `YYYY-MM-DD HH:mm:ss`).

### `isValidDateFormat` et `isValidTimeFormat`
Valident la structure et la logique calendaire élémentaire des chaînes de date et d'heure.
```javascript
/**
 * Valide le format DD/MM/YYYY d'une chaîne de date.
 * @param {string} dateStr
 * @returns {boolean} True si valide
 */
export function isValidDateFormat(dateStr) {
  if (!dateStr) return false;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return false;
  
  const d = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const y = parseInt(parts[2], 10);

  if (isNaN(d) || isNaN(m) || isNaN(y)) return false;
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;
  if (y < 1900 || y > 2100) return false;
  
  return true;
}

/**
 * Valide le format HH:mm d'une chaîne d'heure.
 * @param {string} timeStr
 * @returns {boolean} True si valide
 */
export function isValidTimeFormat(timeStr) {
  if (!timeStr) return true; // Optionnel
  const parts = timeStr.split(':');
  if (parts.length !== 2) return false;

  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);

  if (isNaN(h) || isNaN(m)) return false;
  if (h < 0 || h > 23) return false;
  if (m < 0 || m > 59) return false;

  return true;
}
```

### `buildDateTime`
Transforme les formats de saisie (`DD/MM/YYYY` et `HH:mm`) en format d'API GLPI (`YYYY-MM-DD HH:mm:ss`).
```javascript
/**
 * Transforme des fragments de date/heure en string ISO/MySQL.
 * @param {string} dateStr - Format DD/MM/YYYY
 * @param {string} timeStr - Format HH:mm
 * @returns {string|null} Format "YYYY-MM-DD HH:mm:ss" ou null si invalide
 */
export function buildDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  const dateParts = dateStr.split('/');
  if (dateParts.length !== 3) return null;

  const day = dateParts[0].padStart(2, '0');
  const month = dateParts[1].padStart(2, '0');
  const year = dateParts[2];

  let hour = '12';
  let min = '00';
  if (timeStr && timeStr.includes(':')) {
    const timeParts = timeStr.split(':');
    hour = timeParts[0].padStart(2, '0');
    min = timeParts[1].padStart(2, '0');
  }

  return `${year}-${month}-${day} ${hour}:${min}:00`;
}
```

---

## 3. Mappeurs et Traducteurs d'API GLPI

GLPI utilise des structures d'ID entiers pour typer ou classifier les tickets et équipements. Ces mappeurs traduisent les chaînes lisibles des exports ou imports CSV en identifiants API normalisés.

```javascript
// Correspondance pour le type de ticket
export const TICKET_TYPE_MAP = {
  'Incident': 1,
  'Request': 2,
  'Demande': 2,
};

// Correspondance pour le statut de ticket
export const TICKET_STATUS_MAP = {
  'New': 1,
  'Nouveau': 1,
  'Processing (assigned)': 2,
  'En cours (attribué)': 2,
  'Processing (planned)': 3,
  'En cours (planifié)': 3,
  'Pending': 4,
  'En attente': 4,
  'Solved': 5,
  'Résolu': 5,
  'Closed': 6,
  'Clos': 6,
};

// Correspondance pour le niveau de priorité
export const TICKET_PRIORITY_MAP = {
  'Très basse': 1,
  'Basse': 2,
  'Moyenne': 3,
  'Haute': 4,
  'Très haute': 5,
  'Majeure': 6,
};

// Correspondance des types d'équipements aux tables GLPI
export const ITEMTYPE_MAP = {
  'Computer': 'Computer',
  'Monitor': 'Monitor',
  'Phone': 'Phone',
  'NetworkEquipment': 'NetworkEquipment',
  'Software': 'Software',
  'Printer': 'Printer',
  'UninterruptiblePowerSupply': 'UninterruptiblePowerSupply', // Onduleurs
};
```

---

## 4. Extraction et Nettoyage de Données Complexes

### `parseItemsColumn`
Permet d'extraire les noms de périphériques liés présents dans la colonne complexe `Items` (qui peut être sérialisée en JSON ou séparée par des virgules).
```javascript
/**
 * Parse la colonne "Items" contenant les liaisons d'équipements.
 * Supporte le JSON natif (ex: ["PC-01", "PC-02"]) ou les listes séparées par virgule.
 * @param {string} val - Chaîne brute de la colonne "Items"
 * @returns {Array|null} Tableau des noms d'équipements ou null si échec de parsing JSON
 */
export function parseItemsColumn(val) {
  if (!val) return [];
  const trimmed = val.trim();
  if (!trimmed) return [];

  // Si c'est un format JSON (commence par [)
  if (trimmed.startsWith('[')) {
    try {
      return JSON.parse(trimmed).map(i => String(i).trim());
    } catch (e) {
      return null; // Erreur de format
    }
  }

  // Format simple séparé par des virgules
  return trimmed.split(',').map(i => i.trim()).filter(Boolean);
}
```
