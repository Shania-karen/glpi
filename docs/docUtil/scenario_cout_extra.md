# Scénario : Création d'un Coût de Type 'extra' basé sur le Coût Fixe GLPI

Ce guide explique les modifications à apporter au projet si vous devez introduire un nouveau type de coût nommé **`extra`** dans la base SQLite locale. Ce coût correspondra à un pourcentage du **coût fixe brut GLPI** du ticket.

---

## 1. Fonctionnement Logiciel
Le modèle JPA de la table `couts` (`typeCout`) étant basé sur une chaîne de caractères libre en base de données, **aucune modification de schéma de base de données ou du backend Spring Boot n'est requise** pour ajouter ce nouveau type.

Toute la logique de calcul et d'insertion se fait sur le frontend React.

---

## 2. Étape 1 : Ajout du service d'insertion dans `coutService.js`

Dans [coutService.js](file:///d:/shania/itu/L3/glpi/deskflow/src/services/coutService.js), ajoutez une fonction utilitaire pour insérer les coûts de type `extra` répartis par item :

```javascript
/**
 * Créer un coût de type 'extra' basé sur un pourcentage du coût fixe GLPI.
 */
export async function createExtraCoutsForItems(idTicket, rawFixedCost, percentage, items) {
  const grp = generateTimestamp();
  
  // Calcul du montant brut de l'extra (pourcentage du coût fixe GLPI)
  const totalExtra = parseFloat(((rawFixedCost * percentage) / 100).toFixed(2));

  if (!items || items.length === 0) {
    return createCout({ idTicket, typeCout: 'extra', cout: totalExtra, grp });
  }

  // Division équitable du coût extra par item
  const coutParItem = parseFloat((totalExtra / items.length).toFixed(2));

  for (const item of items) {
    await createCout({
      idTicket,
      typeCout: 'extra',
      cout: coutParItem,
      idItem: item.items_id ?? null,
      category: item.itemtype ?? null,
      grp,
    });
  }
}
```

---

## 3. Étape 2 : Création de la modale/action utilisateur

Dans le formulaire ou la modale appropriée (par exemple lors de l'application de frais additionnels sur un ticket en cours ou résolu), récupérez le coût fixe brut du ticket, puis déclenchez l'insertion :

```javascript
// Exemple de fonction déclenchée au submit du formulaire d'extra
const handleApplyExtra = async (percentageValue) => {
  // 1. Récupérer le ticket GLPI avec ses lignes de coût (unrolledLines)
  const ticket = await fetchDataAPIRest(`Ticket/${ticketId}`);
  
  // 2. Sommer uniquement le coût fixe (cost_fixed)
  const rawFixedCostOnly = (ticket?.unrolledLines || []).reduce((sum, line) => {
    const fixed = parseFloat(String(line.cost_fixed || 0).replace(',', '.')) || 0;
    return sum + fixed;
  }, 0);

  // 3. Récupérer les items liés
  const linkedItems = await fetchDataAPIRest(`Ticket/${ticketId}/Item_Ticket`).catch(() => []);

  // 4. Insérer le coût extra
  await createExtraCoutsForItems(ticketId, rawFixedCostOnly, percentageValue, linkedItems);
};
```

---

## 4. Étape 3 : Mise à jour du Tableau de Bord (`AssetListWithPrice.jsx`)

Pour afficher et intégrer ce nouveau type dans les totaux globaux :

### A. Intégration dans le calcul des statistiques (`stats`)
Dans [AssetListWithPrice.jsx](file:///d:/shania/itu/L3/glpi/deskflow/src/components/ticket/AssetListWithPrice.jsx) :

```javascript
const stats = useMemo(() => {
  const glpiTotal = tickets.reduce((sum, ticket) => { ... }, 0);

  let superTotal = 0;
  let ouvertureTotal = 0;
  let annulationTotal = 0;
  let extraTotal = 0; // <-- AJOUT

  processedCouts.forEach(c => {
    const val = parseFloat(c.cout) || 0;
    if (c.typeCout === 'Supercout') {
      superTotal += val;
    } else if (c.typeCout === 'reouverture') {
      ouvertureTotal += val;
    } else if (c.typeCout === 'annulation') {
      annulationTotal += val;
    } else if (c.typeCout === 'extra') {
      extraTotal += val; // <-- AJOUT
    }
  });

  return {
    glpiTotal,
    superTotal,
    ouvertureTotal,
    annulationTotal,
    extraTotal, // <-- AJOUT
    grandTotal: glpiTotal + superTotal + ouvertureTotal + annulationTotal + extraTotal, // <-- AJOUT
  };
}, [processedCouts, tickets]);
```

### B. Ajout d'une carte d'affichage du total en haut
```jsx
<Card className="p-4 border-neutral-200 bg-white">
  <span className="text-xs text-orange-500 font-bold uppercase tracking-wider">Total Extra Coûts</span>
  <p className="text-xl font-bold text-orange-600 mt-1">{(stats.extraTotal).toFixed(2)} €</p>
</Card>
```

### C. Gestion graphique des badges dans les lignes du tableau
```javascript
} else if (c.typeCout === 'extra') {
  badgeVariant = 'warning'; // Couleur orange/jaune de Tailwind
  textClass = 'text-orange-600 font-semibold';
}
```
