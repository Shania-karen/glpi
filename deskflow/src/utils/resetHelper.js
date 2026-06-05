import { fetchDataAPIRest, fetchGlpiData } from '../services/apiClient';

export const purgeSelectedTables = async (endpoints, onProgress) => {
  let totalDeleted = 0;
  for (const endpoint of endpoints) {
    try {
      const items = await fetchDataAPIRest(`/${endpoint}?range=0-1000`, { method: 'GET' });
      if (!items || items.length === 0) {
        console.log(`Aucune donnée à supprimer dans ${endpoint}.`);
        continue;
      }
      for (let i = 0; i < items.length; i++) {
        const itemId = items[i].id;
        try {
          await fetchDataAPIRest(`${endpoint}/${itemId}?force_purge=true`, {
            method: 'DELETE',
            body: {}
          });
          totalDeleted++;         
          if (onProgress) {
            onProgress(`Purge en cours : ${endpoint}`, totalDeleted, items.length);
          }          
        } catch (err) {
          console.error(`Échec de la suppression de l'ID ${itemId} dans ${endpoint}`, err);
        }
      }
    } catch (error) {
      console.error(`Erreur lors de la lecture de la table ${endpoint} :`, error);
      throw new Error(`Impossible de lire les données pour ${endpoint}.`);
    }
  }

  return totalDeleted;
};