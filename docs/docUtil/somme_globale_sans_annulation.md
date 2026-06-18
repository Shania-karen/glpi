# Guide : Somme Globale des Coûts sans compter les Annulations

Ce document explique comment adapter le code si vous souhaitez obtenir la somme totale consolidée des coûts en ignorant (sans soustraire) les lignes d'annulation (`typeCout = 'annulation'`).

Actuellement, le système fonctionne par soustraction pour annuler le dernier groupe de Supercouts (en insérant des lignes avec des valeurs négatives). Si le besoin métier change et que vous souhaitez ignorer ces annulations pour voir la somme brute historique, suivez ces instructions.

---

## 1. Modification dans le Frontend React

Dans le fichier [AssetListWithPrice.jsx](file:///d:/shania/itu/L3/glpi/deskflow/src/components/ticket/AssetListWithPrice.jsx), localisez le calcul du `superCout` pour chaque équipement et retirez le filtre du type `'annulation'`.

### Code Actuel (Avec Annulations)

```javascript
// On somme Supercout + annulation (les annulations ont des valeurs négatives)
const superCout = allCouts
  .filter(c => String(c.idItem) === assetIdStr &&
               String(c.idTicket) === ticketIdStr &&
               (c.typeCout === 'Supercout' || c.typeCout === 'annulation'))
  .reduce((sum, c) => sum + (c.cout || 0), 0);
```

### Code Modifié (Sans Annulations)

Pour ignorer les lignes d'annulation et ne sommer que les `Supercout` bruts :

```javascript
// On somme uniquement les Supercouts historiques, sans soustraire les annulations
const superCout = allCouts
  .filter(c => String(c.idItem) === assetIdStr &&
               String(c.idTicket) === ticketIdStr &&
               c.typeCout === 'Supercout')
  .reduce((sum, c) => sum + (c.cout || 0), 0);
```

---

## 2. Optionnel : Filtrer au niveau de la base de données SQL

Si vous souhaitez effectuer cette somme globale directement via une requête SQL brute (sans charger les annulations en mémoire), vous pouvez exécuter la requête suivante :

```sql
SELECT SUM(cout) AS total_supercout 
FROM couts 
WHERE type_cout = 'Supercout';
```

Au lieu de :

```sql
-- Calcule la somme nette (Supercouts - Annulations)
SELECT SUM(cout) AS total_net_supercout 
FROM couts 
WHERE type_cout IN ('Supercout', 'annulation');
```
