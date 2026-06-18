## Scénario 1 : Le Plafonnement (Validation stricte)
La consigne : "Le pourcentage d'une réouverture ne doit jamais dépasser 50%, peu importe ce qui est saisi dans l'interface ou le CSV."

La solution : Tu modifies uniquement la fonction reopenTicketWithCosts dans coutWorkflowService.js. Tu interceptes la valeur du pourcentage dès le début de la fonction.


```javascript
export async function reopenTicketWithCosts(ticketId, percentage, options = {}) {
  const { updateGLPIStatus = true } = options;
  const createdIds = [];

  // 1. AJOUT DE LA LOGIQUE MÉTIER ICI (Le plafond)
  let appliedPercentage = percentage;
  if (appliedPercentage > 50) {
    console.warn(`[Règle métier] Pourcentage ${percentage}% trop élevé, plafonné à 50%.`);
    appliedPercentage = 50; 
    // Ou tu pourrais faire : throw new Error("Le pourcentage ne peut pas dépasser 50%");
  }

  const latestGroup = await getLatestGroupCouts(ticketId, 'Supercout');
  if (!latestGroup || latestGroup.length === 0) {
    throw new Error(`Aucun Supercout trouvé pour le ticket #${ticketId}`);
  }

  const grp = Date.now();
  for (const entry of latestGroup) {
    // 2. On utilise 'appliedPercentage' pour le calcul
    const coutReouv = parseFloat(((entry.cout * appliedPercentage) / 100).toFixed(2));
    const res = await createCout({
      idTicket: ticketId,
      typeCout: 'reouverture',
      cout: coutReouv,
      idItem: entry.idItem ?? null,
      category: entry.category ?? null,
      grp,
    });
    if (res?.idAuto) createdIds.push(res.idAuto);
  }

  // ... suite du code (GLPI) ...
  return createdIds;
}
```
---

## Scénario 2 : La Répartition Inégale (Modification mathématique)
La consigne : "S'il y a plusieurs équipements (items) liés au ticket, le premier équipement prend une charge fixe de 100€, et le reste du coût est divisé équitablement entre les équipements restants."

La solution : Tu modifies la logique de division dans closeTicketWithCosts. L'import CSV et l'interface utiliseront automatiquement cette nouvelle règle.

```javascript
export async function closeTicketWithCosts(ticketId, totalCost, options = {}) {
  // ... code existant (followup, update GLPI, récupération linkedItems) ...

  const grp = Date.now();
  if (linkedItems.length === 0) {
    // Cas sans équipement : on ne change rien
    const res = await createCout({ idTicket: ticketId, typeCout: 'Supercout', cout: totalCost, grp });
    if (res?.idAuto) createdIds.push(res.idAuto);
  } else {
    
    // 1. NOUVELLE LOGIQUE MÉTIER DE RÉPARTITION
    // On isole le premier item
    const firstItem = linkedItems[0];
    const remainingItems = linkedItems.slice(1);
    
    // On calcule la charge du premier item (100€, ou moins si le total est < 100)
    const firstItemCost = Math.min(totalCost, 100);
    const remainingCost = totalCost - firstItemCost;

    // Insertion du 1er item
    let res = await createCout({
      idTicket: ticketId,
      typeCout: 'Supercout',
      cout: firstItemCost,
      idItem: firstItem.items_id ?? null,
      category: firstItem.itemtype ?? null,
      grp,
    });
    if (res?.idAuto) createdIds.push(res.idAuto);

    // Insertion des autres items s'il y en a et s'il reste de l'argent
    if (remainingItems.length > 0 && remainingCost > 0) {
      const coutParItemRestant = parseFloat((remainingCost / remainingItems.length).toFixed(2));
      for (const item of remainingItems) {
        res = await createCout({
          idTicket: ticketId,
          typeCout: 'Supercout',
          cout: coutParItemRestant,
          idItem: item.items_id ?? null,
          category: item.itemtype ?? null,
          grp,
        });
        if (res?.idAuto) createdIds.push(res.idAuto);
      }
    }
  }

  return createdIds;
}
```
---

## Scénario 3 : Ajout d'une action obligatoire (Trace GLPI)
La consigne : "Pour l'audit, TOUTES les annulations de coûts doivent laisser une trace dans le ticket GLPI via un ITILFollowup, qu'elles viennent d'un import de masse ou d'un clic manuel."

La solution : C'est le cas le plus facile grâce à ton architecture. Tu vas simplement ajouter un appel API dans cancelTicketCosts.

```javascript
export async function cancelTicketCosts(ticketId, options = {}) {
  const { updateGLPIStatus = true } = options;
  const createdIds = [];

  const latestGroup = await getLatestGroupCouts(ticketId, 'Supercout');
  if (!latestGroup || latestGroup.length === 0) {
    throw new Error(`Aucun Supercout trouvé pour le ticket #${ticketId}`);
  }

  // 1. NOUVELLE LOGIQUE : Ajout de la trace dans GLPI
  await fetchDataAPIRest('ITILFollowup', {
    method: 'POST',
    body: { 
      input: { 
        items_id: ticketId, 
        itemtype: 'Ticket', 
        content: "Audit : Annulation des coûts financiers effectuée dans le système." 
      } 
    },
  });

  // ... suite du code existant (création des coûts négatifs, mise à jour du statut) ...
  
  return createdIds;
}
```