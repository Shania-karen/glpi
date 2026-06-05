import { fetchGlpiData } from '../services/apiClient';

export const parseCSVToTickets = (csvText) => {
  const lines = csvText.trim().split(/\r?\n/);
  const dataLines = lines.slice(1);
  
  const ticketsToImport = dataLines.map((line, index) => {
    const separator = line.includes(';') ? ';' : ',';
    const columns = line.split(separator);
    const cleanColumns = columns.map(col => col ? col.trim() : '');

    if (index === 0) {
      console.log(" TEST LECTURE - Ligne 1 brute :", line);
      console.log(" TEST LECTURE - Colonnes découpées :", cleanColumns);
    }
    // return {
    //   name: cleanColumns[1] || 'Sans titre',               
    //   content: cleanColumns[2] || 'Pas de description', 
    //   priority: parseInt(cleanColumns[3]) || 3,          
    //   itilcategories_id: parseInt(cleanColumns[4]) || '',  
    //   status: parseInt(cleanColumns[5]) || 1,          
    //   type: parseInt(cleanColumns[6]) || 1,            
    //   requesttypes_id: parseInt(cleanColumns[7]) || 1,
    //   urgency: parseInt(cleanColumns[8]) || 3,    
    //   impact: parseInt(cleanColumns[9]) || 3,     
    //   actiontime: parseInt(cleanColumns[10]) || 0,
    //   _users_id_requester: parseInt(cleanColumns[11]) || '', 
    //   _users_id_assign: parseInt(cleanColumns[12]) || ''
    // };
    return {
        name: cleanColumns[1] || 'Testttttttttttfghjklmj',     // On récupère ton titre
        content: "Import depuis le fichier CSV",   // Texte fixe
        status: 1,                                 // 1 = Nouveau
        type: 1,                                   // 1 = Incident
        urgency: 3,                                // 3 = Moyenne
        impact: 3,                                 // 3 = Moyen
        priority: 3,                               // 3 = Moyenne
        requesttypes_id: 1                         // 1 = Helpdesk
        };
  });

  return ticketsToImport.filter(ticket => ticket.name !== 'Sans titre' && ticket.name !== '');
};

export const processTicketImport = async (file, onProgress) => {
  const textContent = await file.text();
  const ticketsToImport = parseCSVToTickets(textContent);

  if (ticketsToImport.length === 0) {
    throw new Error("Aucun ticket valide trouvé dans le fichier.");
  }

  const createdTicketIds = []; 

  for (let i = 0; i < ticketsToImport.length; i++) {
    const ticket = ticketsToImport[i];
    
    try {
      const response = await fetchGlpiData('/Assistance/Ticket', { 
        method: 'POST', 
        body: ticket 
        
    });
    console.log("Ticket créé avec ID:", response.name);

      if (response && response.id) {
        createdTicketIds.push(response.id);
      }
      if (onProgress) onProgress(i + 1, ticketsToImport.length);

    } catch (err) {
      console.error(`Erreur sur le ticket "${ticket.name}":`, err);
      console.warn(" Erreur détectée : Lancement du Rollback...");
    
      for (const idToDelete of createdTicketIds) {
        try {
          await fetchGlpiData(`/Assistance/Ticket/${idToDelete}?force_purge=true`, {
            method: 'DELETE'
          });
        } catch (rollbackErr) {
          console.error(`Échec de la suppression du ticket ${idToDelete} lors du rollback.`, rollbackErr);
        }
      }
      throw new Error(`Import annulé. Rollback de ${createdTicketIds.length} tickets effectué suite à une erreur sur "${ticket.name}".`);
    }
  }
  return createdTicketIds.length;
};