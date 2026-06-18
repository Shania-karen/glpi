import { deleteCout } from './coutService';
import { 
  closeTicketWithCosts, 
  reopenTicketWithCosts, 
  cancelTicketCosts, 
  reopenTicketWithCostsModeTwo,
  reopenTicketWithCostsModeThree,
  reopenTicketWithCostsModeFour
} from './coutWorkflowService';
import { fetchDataAPIRest } from './apiClient';
import Papa from 'papaparse';

export const parseCSVToCouts = (csvText) => {
  if (!csvText) return [];
  
  // Utilisation de PapaParse pour parser de manière robuste (gestion des guillemets et détection de délimiteur)
  const parsed = Papa.parse(csvText, {
    header: false,
    skipEmptyLines: 'greedy'
  });

  const rows = parsed.data || [];
  if (rows.length === 0) return [];

  let startIndex = 0;
  // Détection de la ligne d'en-tête (si le premier champ de la première ligne n'est pas un nombre)
  if (rows[0] && rows[0][0] && isNaN(Number(String(rows[0][0]).trim()))) {
    startIndex = 1; 
  }

  const dataLines = rows.slice(startIndex); 
  const costsToImport = dataLines.map((columns) => {
    const cleanColumns = columns.map(col => col !== null && col !== undefined ? String(col).trim() : '');

    // Gestion virgule décimale sans guillemets : "2,open,7,5,4" → 5 colonnes au lieu de 4
    // On fusionne col[2]+col[3] UNIQUEMENT si col[4] (le mode décalé) est non-vide.
    // Sinon c'est une virgule finale (ex: "2,open,10,3,") → col[4]="" → pas de fusion.
    if (cleanColumns.length >= 5 && cleanColumns[4] !== ''
        && cleanColumns[2] !== '' && cleanColumns[3] !== ''
        && !isNaN(Number(cleanColumns[2])) && !isNaN(Number(cleanColumns[3]))) {
      return {
        ticket: cleanColumns[0] || '',
        mvt: cleanColumns[1] || '',
        valeur: cleanColumns[2] + '.' + cleanColumns[3],  // "7" + "." + "5" → "7.5"
        mode: cleanColumns[4] || ''
      };
    }

    return {
      ticket: cleanColumns[0] || '',
      mvt: cleanColumns[1] || '',
      valeur: cleanColumns[2] || '',
      mode: cleanColumns[3] || ''
    };
  });

  return costsToImport.filter(cout => cout.ticket !== '' && cout.mvt !== '');
};

export const processTicketImport = async (file, onProgress) => {
  const textContent = await file.text();
  const costsToImport = parseCSVToCouts(textContent);

  if (costsToImport.length === 0) {
    throw new Error("Aucun cout valide trouvé dans le fichier.");
  }

  const limit = 500;
  let start = 0;
  let allTickets = [];
  try {
    while (true) {
      const data = await fetchDataAPIRest(`Ticket?range=${start}-${start + limit - 1}`);
      if (!data || !Array.isArray(data) || data.length === 0) break;
      allTickets = allTickets.concat(data);
      if (data.length < limit) break;
      start += limit;
    }
  } catch (err) {
    console.error("Erreur lors de la récupération des tickets pour le mapping :", err);
    throw new Error("Impossible de charger la liste des tickets pour mapper les index du CSV.");
  }

  const createdCostIds = []; 

  for (let i = 0; i < costsToImport.length; i++) {
    const cout = costsToImport[i];
    
    // Le ticket dans le CSV correspond à l'externalid de GLPI
    const csvExternalId = String(cout.ticket).trim();
    const matchedTicket = allTickets.find(t => t.externalid && String(t.externalid).trim() === csvExternalId);
    if (!matchedTicket) {
      throw new Error(`Aucun ticket avec l'externalid "${csvExternalId}" n'a été trouvé dans GLPI.`);
    }
    
    const ticketId = Number(matchedTicket.id);

    const mvt = cout.mvt.toLowerCase().trim();
    const mode = cout.mode ? cout.mode.replace(',', '.') : '';
    const val = cout.valeur ? cout.valeur.replace(',', '.') : '';

    try {
      let ids = [];

      if (mvt === 'open' || mvt === 'reouverture') {
        const pct = parseFloat(val) || 0;
        if (mode === '2') {
          ids = await reopenTicketWithCostsModeTwo(ticketId, pct, { updateGLPIStatus: true });
        } else if (mode === '3') {
          ids = await reopenTicketWithCostsModeThree(ticketId, pct, { updateGLPIStatus: true });
        } else if (mode === '4') {
          ids = await reopenTicketWithCostsModeFour(ticketId, pct, { updateGLPIStatus: true });
        } else {
          // Mode 1 par défaut (dernier supercost)
          ids = await reopenTicketWithCosts(ticketId, pct, { updateGLPIStatus: true });
        }
        
      } else if (mvt === 'close' || mvt === 'termine' || mvt === 'terminé') {
        const totalCout = parseFloat(val) || 0;
        
        ids = await closeTicketWithCosts(ticketId, totalCout, { updateGLPIStatus: true });
        
      } else if (mvt === 'cancel' || mvt === 'annuler' || mvt === 'annule') {
      
        ids = await cancelTicketCosts(ticketId, { updateGLPIStatus: true });
      }
      createdCostIds.push(...ids);

      if (onProgress) onProgress(i + 1, costsToImport.length);
    } catch (err) {
      console.error(`Erreur sur le ticket #${ticketId} (External ID #${csvExternalId}):`, err);
      console.warn("Erreur détectée : Lancement du Rollback...");
    
      for (const idToDelete of createdCostIds) {
        try {
          await deleteCout(idToDelete);
        } catch (rollbackErr) {
          console.error(`Échec de la suppression du cout ${idToDelete} lors du rollback.`, rollbackErr);
        }
      }
      throw new Error(`Import annulé. Rollback de ${createdCostIds.length} tickets effectué suite à une erreur sur le ticket #${ticketId} (External ID #${csvExternalId}) : ${err.message}`);
    }
  }
  return createdCostIds.length;
};
