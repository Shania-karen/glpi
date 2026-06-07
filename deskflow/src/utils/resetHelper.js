import { fetchDataAPIRest, fetchGlpiData } from '../services/apiClient';

export const purgeSelectedTables = async (endpoints, onProgress) => {
  let totalDeleted = 0;

  // Ordre de priorité de purge pour éviter les conflits et erreurs de droits (les Tickets en premier)
  const priorityOrder = [
    'Ticket',
    'Item_Ticket',
    'TicketTask',
    'TicketCost',
    'Document_Item',
    'Document',
    'Computer',
    'Monitor',
    'NetworkEquipment',
    'Peripheral',
    'Phone',
    'Printer',
    'SoftwareLicense',
    'Certificate',
    'Unmanaged',
    'Appliance',
    'Database',
    'Enclosure',
    'Rack',
    'PassiveDCEquipment',
    'CartridgeItem',
    'PDU',
    'Cable',
    'ConsumableItem',
    'ComputerModel',
    'MonitorModel',
    'NetworkEquipmentModel',
    'PeripheralModel',
    'PhoneModel',
    'PrinterModel',
    'RackModel',
    'EnclosureModel',
    'PassiveDCEquipmentModel',
    'PDUModel',
    'ComputerType',
    'MonitorType',
    'NetworkEquipmentType',
    'PeripheralType',
    'PhoneType',
    'PrinterType',
    'RackType',
    'EnclosureType',
    'PassiveDCEquipmentType',
    'PDUType',
    'CableType',
    'Software',
    'State',
    'Manufacturer',
    'Location',
    'User'
  ];

  const sortedEndpoints = [...endpoints].sort((a, b) => {
    const idxA = priorityOrder.indexOf(a);
    const idxB = priorityOrder.indexOf(b);
    const posA = idxA === -1 ? 999 : idxA;
    const posB = idxB === -1 ? 999 : idxB;
    return posA - posB;
  });

  // Utilitaire d'exécution par lots parallèles
  const runInBatches = async (items, batchSize, asyncFn) => {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await Promise.all(batch.map(asyncFn));
    }
  };

  for (const endpoint of sortedEndpoints) {
    try {
      const rawItems = await fetchDataAPIRest(`/${endpoint}?range=0-1000`, { method: 'GET' });
      const items = Array.isArray(rawItems) ? rawItems : [];

      if (items.length === 0) {
        console.log(`Aucune donnée à supprimer dans ${endpoint}.`);
        continue;
      }

      let localDeleted = 0;
      await runInBatches(items, 20, async (item) => {
        const itemId = item.id;
        try {
          await fetchDataAPIRest(`${endpoint}/${itemId}?force_purge=true`, {
            method: 'DELETE',
            body: {}
          });
          localDeleted++;
          totalDeleted++;
          if (onProgress) {
            onProgress(`Purge en cours : ${endpoint}`, localDeleted, items.length);
          }
        } catch (err) {
          console.error(`Échec de la suppression de l'ID ${itemId} dans ${endpoint}`, err);
        }
      });
    } catch (error) {
      console.error(`Erreur lors de la lecture de la table ${endpoint} :`, error);
      throw new Error(`Impossible de lire les données pour ${endpoint}.`);
    }
  }

  return totalDeleted;
};