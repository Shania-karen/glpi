# Fonctionnement de l'Import : Gestion des Coûts Négatifs, Format de Date et Rollback

Ce document détaille les règles de validation, le comportement de l'application et le mécanisme de rollback en cas d'erreur de données lors de l'import CSV.

---

## 1. Que se passe-t-il si un coût est négatif dans le CSV ?

### 1.1. Nettoyage de la valeur (Sanitization)
Le coût est traité par la fonction `sanitizeNumber` dans [`importService.js`](file:///d:/shania/itu/L3/glpi/deskflow/src/services/importService.js) :
```javascript
function sanitizeNumber(val) {
  if (val === null || val === undefined || val === '') return 0;
  return parseFloat(String(val).replace(',', '.')) || 0;
}
```
* **Conversion** : La valeur brute (ex: `"-45,50"`) est convertie en nombre flottant négatif (`-45.5`).
* **Valeur acceptée** : Le script envoie cette valeur négative à l'API GLPI lors de la création du coût (`TicketCost`).

### 1.2. Comportement GLPI & Rollback
1. **Si la base de données GLPI accepte les coûts négatifs** : Le coût est importé et enregistré tel quel.
2. **Si GLPI rejette les coûts négatifs (Erreur API HTTP 400)** :
   * L'API renvoie une exception.
   * Cette exception est interceptée par le bloc `try...catch` de l'importateur.
   * **Le Rollback est déclenché automatiquement** : Tous les tickets, coûts, équipements et liaisons déjà créés au cours de cette session d'importation sont purgés (supprimés de la base de données GLPI via des requêtes `DELETE` avec `force_purge=true`).

---

## 2. Que se passe-t-il si le format d'une date est incorrect ?

### 2.1. Analyse de la date (Parsing)
Les dates du CSV sont validées et formatées par la fonction `buildDateTime` :
```javascript
function buildDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  const time = timeStr ? timeStr.trim() : '00:00';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time}:00`;
}
```

### 2.2. Conséquences d'un mauvais format
1. **Format incomplet (ex: `"12/05"`)** : La fonction retourne `null` (car elle attend 3 parties séparées par des `/`).
2. **Date absente** : Retourne `null`.
3. **Date invalide (ex: `"32/13/2026"`)** : La chaîne de caractères finale envoyée sera `"2026-13-32 00:00:00"`.

### 2.3. Réaction de l'API GLPI & Rollback
* Si une date obligatoire est `null`, ou si la date envoyée est logiquement invalide (ex: 13ème mois ou 32ème jour), le serveur MySQL/GLPI rejette la requête HTTP `POST` de création du ticket avec un code erreur HTTP 400 ou 500.
* Cette erreur interrompt immédiatement le script d'importation.
* Le mécanisme de **Rollback** s'exécute alors, supprimant en cascade tous les objets précédemment créés pour cette session d'import afin de ne pas laisser la base de données dans un état partiel ("dirty state").
