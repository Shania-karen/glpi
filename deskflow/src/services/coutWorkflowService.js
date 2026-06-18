import { fetchDataAPIRest } from './apiClient';
import { 
  createCout, 
  getLatestGroupCouts,
  getFirstGroupCouts, 
  getAverageCout, 
  getSumCout
} from './coutService';


export async function closeTicketWithCosts(ticketId, totalCost, options = {}) {
  const { 
    updateGLPIStatus = true, 
    followupContent = null 
  } = options;
  
  const createdIds = [];

  // A. Ajout d'un suivi de motif si fourni (ex: motif de refus)
  if (followupContent) {
    await fetchDataAPIRest('ITILFollowup', {
      method: 'POST',
      body: { input: { items_id: ticketId, itemtype: 'Ticket', content: followupContent } },
    });
  }

  // B. Mise à jour du statut du ticket dans GLPI (statut 6 = Clos)
  if (updateGLPIStatus) {
    await fetchDataAPIRest(`Ticket/${ticketId}`, {
      method: 'PUT',
      body: { input: { id: ticketId, status: 6 } },
    });
  }

  // C. Récupération des équipements liés
  let linkedItems = [];
  try {
    const raw = await fetchDataAPIRest(`Ticket/${ticketId}/Item_Ticket`);
    linkedItems = Array.isArray(raw) ? raw : (raw ? [raw] : []);
  } catch (err) {
    console.warn('[SuperCout] Aucun Item_Ticket trouvé ou erreur api:', err.message);
  }

  // D. Répartition et insertion des coûts dans SQLite
  const grp = Date.now();
  if (linkedItems.length === 0) {
    const res = await createCout({
      idTicket: ticketId,
      typeCout: 'Supercout',
      cout: totalCost,
      grp,
    });
    if (res?.idAuto) createdIds.push(res.idAuto);
  } else {
    const coutParItem = parseFloat((totalCost / linkedItems.length).toFixed(2));
    for (const item of linkedItems) {
      const res = await createCout({
        idTicket: ticketId,
        typeCout: 'Supercout',
        cout: coutParItem,
        idItem: item.items_id ?? null,
        category: item.itemtype ?? null,
        grp,
      });
      if (res?.idAuto) createdIds.push(res.idAuto);
    }
  }

  return createdIds;
}

//mode 1
export async function reopenTicketWithCosts(ticketId, percentage, options = {}) {
  const { updateGLPIStatus = true } = options;
  const createdIds = [];

  const latestGroup = await getLatestGroupCouts(ticketId, 'Supercout');
  if (!latestGroup || latestGroup.length === 0) {
    throw new Error(`Aucun Supercout trouvé pour le ticket #${ticketId}`);
  }
  const grp = Date.now();
  for (const entry of latestGroup) {
    const coutReouv = parseFloat(((entry.cout * percentage) / 100).toFixed(2));
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

  if (updateGLPIStatus) {
    await fetchDataAPIRest(`Ticket/${ticketId}`, {
      method: 'PUT',
      body: { input: { id: ticketId, status: 2 } },
    });
  }

  return createdIds;
}

//mode 2 
export async function reopenTicketWithCostsModeTwo(ticketId, percentage, options = {}) {
  const { updateGLPIStatus = true } = options;
  const createdIds = [];

  const firstGroup = await getFirstGroupCouts(ticketId, 'Supercout');
  if (!firstGroup || firstGroup.length === 0) {
    throw new Error(`Aucun Supercout trouvé pour le ticket #${ticketId}`);
  }
  const grp = Date.now();
  for (const entry of firstGroup) {
    const coutReouv = parseFloat(((entry.cout * percentage) / 100).toFixed(2));
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

  if (updateGLPIStatus) {
    await fetchDataAPIRest(`Ticket/${ticketId}`, {
      method: 'PUT',
      body: { input: { id: ticketId, status: 2 } },
    });
  }

  return createdIds;
}
//mode3
export async function reopenTicketWithCostsModeThree(ticketId, percentage, options = {}) {
   const { updateGLPIStatus = true } = options;
  const createdIds = [];
   const average = await getAverageCout(ticketId, 'Supercout');

  const latestGroup = await getLatestGroupCouts(ticketId, 'Supercout');
  if (!latestGroup || latestGroup.length === 0) {
    throw new Error(`Aucun Supercout trouvé pour le ticket #${ticketId}`);
  }
  const grp = Date.now();
  // Proratiser la moyenne globale par le nombre d'items du dernier groupe
  const averageParItem = average / latestGroup.length;
  for (const entry of latestGroup) {
    const coutReouv = parseFloat(((averageParItem * percentage) / 100).toFixed(2));
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

  if (updateGLPIStatus) {
    await fetchDataAPIRest(`Ticket/${ticketId}`, {
      method: 'PUT',
      body: { input: { id: ticketId, status: 2 } },
    });
  }

  return createdIds;
}

//mode 4

export async function reopenTicketWithCostsModeFour(ticketId, percentage, options = {}) {
  const { updateGLPIStatus = true } = options;
  const createdIds = [];
   const sum = await getSumCout(ticketId, 'Supercout');

  const latestGroup = await getLatestGroupCouts(ticketId, 'Supercout');
  if (!latestGroup || latestGroup.length === 0) {
    throw new Error(`Aucun Supercout trouvé pour le ticket #${ticketId}`);
  }
  const grp = Date.now();
  // Proratiser la somme globale par le nombre d'items du dernier groupe
  const sumParItem = sum / latestGroup.length;
  for (const entry of latestGroup) {
    const coutReouv = parseFloat(((sumParItem * percentage) / 100).toFixed(2));
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

  if (updateGLPIStatus) {
    await fetchDataAPIRest(`Ticket/${ticketId}`, {
      method: 'PUT',
      body: { input: { id: ticketId, status: 2 } },
    });
  }

  return createdIds;
}


export async function cancelTicketCosts(ticketId, options = {}) {
  const { updateGLPIStatus = true } = options;
  const createdIds = [];

  const latestGroup = await getLatestGroupCouts(ticketId, 'Supercout');
  if (!latestGroup || latestGroup.length === 0) {
    throw new Error(`Aucun Supercout trouvé pour le ticket #${ticketId}`);
  }

  const grp = Date.now();
  for (const entry of latestGroup) {
    const res = await createCout({
      idTicket: ticketId,
      typeCout: 'annulation',
      cout: -(entry.cout || 0),
      idItem: entry.idItem ?? null,
      category: entry.category ?? null,
      grp,
    });
    if (res?.idAuto) createdIds.push(res.idAuto);
  }

  if (updateGLPIStatus) {
    await fetchDataAPIRest(`Ticket/${ticketId}`, {
      method: 'PUT',
      body: { input: { id: ticketId, status: 2 } },
    });
  }

  return createdIds;
}
