
const SPRING_API = '/api';

export function generateTimestamp() {
  return Date.now();
}

export async function createCout({ idTicket, typeCout, cout, idItem = null, category = null, grp = null, mode = null , valeur=null, plafond=null }) {
  const payload = {
    idTicket: Number(idTicket),
    typeCout,
    cout: Number(cout),
    idItem: idItem !== null ? Number(idItem) : null,
    category: category || null,
    grp: grp !== null ? Number(grp) : generateTimestamp(),
    mode : mode!==null? Number(mode) : null,
    valeur : valeur !==null ? Number(valeur) : null,
    plafond : plafond !==null ? Number(plafond) : null,
  };

  const res = await fetch(`${SPRING_API}/couts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erreur lors de la création du cout');
  }

  return res.json();
}

export async function updateCoutGroup(grp,{
  typeCout , cout , mode , valeur,plafond
}){
  const payload={
    typeCout,
    cout : cout!== undefined ? Number(cout) :
    undefined , 
    mode : mode !== undefined ? Number (mode):
    undefined,
    valeur : valeur !==undefined ? Number(valeur): undefined,
    plafond : plafond !==undefined ? Number(plafond): undefined
  };
 const res = await fetch(`${SPRING_API}/couts/group/${grp}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Erreur lors de la modification du groupe de coûts');
  }

}


export async function createSuperCoutsForItems(idTicket, totalCout, items) {
  const grp = generateTimestamp();

  if (!items || items.length === 0) {
    // Fallback : pas d'items connus → une seule ligne sans idItem
    return createCout({ idTicket, typeCout: 'Supercout', cout: totalCout, grp });
  }

  const coutParItem = parseFloat((totalCout / items.length).toFixed(2));

  for (const item of items) {
    await createCout({
      idTicket,
      typeCout: 'Supercout',
      cout: coutParItem,
      idItem: item.items_id ?? null,
      category: item.itemtype ?? null, // ex: "Computer", "Monitor"…
      grp, // identique pour chaque ligne du groupe
    });
  }
}

export async function createReouvertureCoutsForItems(idTicket, totalCout, items) {
  const grp = generateTimestamp();

  if (!items || items.length === 0) {
    return createCout({ idTicket, typeCout: 'reouverture', cout: totalCout, grp });
  }

  const coutParItem = parseFloat((totalCout / items.length).toFixed(2));

  for (const item of items) {
    await createCout({
      idTicket,
      typeCout: 'reouverture',
      cout: coutParItem,
      idItem: item.items_id ?? null,
      category: item.itemtype ?? null,
      grp,
    });
  }
}

/** @deprecated Utiliser createSuperCoutsForItems */
export async function createSuperCout(idTicket, cout, idItem = null, category = null) {
  return createCout({ idTicket, typeCout: 'Supercout', cout, idItem, category, grp: generateTimestamp() });
}

/** @deprecated Utiliser createReouvertureCoutsForItems */
export async function createReouvertureCout(idTicket, cout, idItem = null, category = null) {
  return createCout({ idTicket, typeCout: 'reouverture', cout, idItem, category, grp: generateTimestamp() });
}

// ─── Lecture ────────────────────────────────────────────────────────────────

/**
 * Récupère tous les enregistrements de la table "couts".
 */
export async function getAllCouts() {
  try {
    const res = await fetch(`${SPRING_API}/couts`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[getAllCouts] Spring Boot non accessible ou table vide:', err.message);
    return [];
  }
}

/**
 * Récupère tous les couts d'un ticket donné.
 */
export async function getCoutsByTicket(idTicket) {
  try {
    const res = await fetch(`${SPRING_API}/couts/byTicket/${idTicket}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[getCoutsByTicket] Erreur:', err.message);
    return [];
  }
}

/**
 * Récupère tous les couts d'un type donné ("Supercout", "reouverture", "glpi").
 */
export async function getCoutsByType(typeCout) {
  try {
    const res = await fetch(`${SPRING_API}/couts/byType/${encodeURIComponent(typeCout)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn(`[getCoutsByType(${typeCout})] Erreur:`, err.message);
    return [];
  }
}

/**
 * Récupère TOUTES les lignes du DERNIER groupe (MAX grp) pour un ticket+type.
 * Utilisé avant de créer des lignes d'annulation.
 */
export async function getLatestGroupCouts(idTicket, typeCout) {
  try {
    const res = await fetch(
      `${SPRING_API}/couts/latestGroup/${idTicket}/${encodeURIComponent(typeCout)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[getLatestGroupCouts] Erreur:', err.message);
    return [];
  }
}

export async function getFirstGroupCouts(idTicket, typeCout) {
  try {
    const res = await fetch(
      `${SPRING_API}/couts/firstGroup/${idTicket}/${encodeURIComponent(typeCout)}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[getfirstGroupCouts] Erreur:', err.message);
    return [];
  }
}



/**
 * Annule le dernier groupe de SuperCouts en insérant des lignes négatives.
 * typeCout = "annulation", cout = -(valeur d'origine), même idItem / category.
 * Toutes les lignes d'annulation partagent le même grp (nouveau timestamp).
 *
 * @param {number} idTicket       - ID du ticket GLPI
 * @param {Array}  latestGroup    - Lignes du dernier groupe Supercout
 *                                  (obtenues via getLatestGroupCouts)
 */
export async function createAnnulationCouts(idTicket, latestGroup) {
  if (!latestGroup || latestGroup.length === 0) return;
  const grp = generateTimestamp(); // nouveau timestamp pour l'événement annulation
  for (const entry of latestGroup) {
    await createCout({
      idTicket,
      typeCout: 'annulation',
      cout: -(entry.cout || 0), // valeur négative = soustraction
      idItem:   entry.idItem   ?? null,
      category: entry.category ?? null,
      grp,
    });
  }
}

export async function getFirstCout(idTicket, typeCout) {
  try {
    const res = await fetch(
      `${SPRING_API}/couts/first/${idTicket}/${encodeURIComponent(typeCout)}`
    );
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.warn(`[getLatestCout] Erreur:`, err.message);
    return null;
  }
}
export async function getAverageCout(idTicket, typeCout) {
  try {
    const res = await fetch(
      `${SPRING_API}/couts/average/${idTicket}/${encodeURIComponent(typeCout)}`
    );
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.warn(`[getLatestCout] Erreur:`, err.message);
    return null;
  }
}
export async function getSumCout(idTicket, typeCout) {
  try {
    const res = await fetch(
      `${SPRING_API}/couts/sum/${idTicket}/${encodeURIComponent(typeCout)}`
    );
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.warn(`[getLatestCout] Erreur:`, err.message);
    return null;
  }
}

export async function getLatestCout(idTicket, typeCout) {
  try {
    const res = await fetch(
      `${SPRING_API}/couts/latest/${idTicket}/${encodeURIComponent(typeCout)}`
    );
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.warn(`[getLatestCout] Erreur:`, err.message);
    return null;
  }
}

// ─── Suppression ────────────────────────────────────────────────────────────

/**
 * Supprime tous les couts d'un ticket (tous types confondus).
 */
export async function deleteCoutsByTicket(idTicket) {
  const res = await fetch(`${SPRING_API}/couts/byTicket/${idTicket}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(text || `Erreur suppression couts ticket #${idTicket}`);
  }
}

export async function deleteCoutGroup(grp) {
  const res = await fetch(`${SPRING_API}/couts/group/${grp}`, {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(text || `Erreur suppression couts ticket #${grp}`);
  }
}

/**
 * Supprime les couts d'un ticket pour un type précis (TOUS les groupes).
 */
export async function deleteCoutsByTicketAndType(idTicket, typeCout) {
  const res = await fetch(
    `${SPRING_API}/couts/byTicketAndType/${idTicket}/${encodeURIComponent(typeCout)}`,
    { method: 'DELETE' }
  );
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(text || `Erreur suppression cout type "${typeCout}" ticket #${idTicket}`);
  }
}

/**
 * Supprime UNIQUEMENT le DERNIER groupe (MAX grp) pour un ticket+type.
 * Utilisé lors de l'annulation : n'efface que le dernier événement.
 */
export async function deleteLatestCoutsByTicketAndType(idTicket, typeCout) {
  const res = await fetch(
    `${SPRING_API}/couts/latestByTicketAndType/${idTicket}/${encodeURIComponent(typeCout)}`,
    { method: 'DELETE' }
  );
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(text || `Erreur suppression dernier groupe "${typeCout}" ticket #${idTicket}`);
  }
}

/**
 * Supprime un enregistrement par son id_Auto.
 */
export async function deleteCout(id) {
  const res = await fetch(`${SPRING_API}/couts/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    const text = await res.text();
    throw new Error(text || `Erreur suppression cout id=${id}`);
  }
}
