import Papa from 'papaparse';
import JSZip from 'jszip';
import { fetchDataAPIRest } from './apiClient';

const GLPI_STATUS_MAP = {
  'En production': 1,
  'En panne':      4,
  'En stock':      3,
  'Maintenance':   5,
};

const TICKET_STATUS_MAP = {
  'New':         1,
  'Nouveau':     1,
  'In Progress': 2,
  'Processing':  2,
  'En cours':    2,
  'Assigned':    2,
  'Assigné':     2,
  'Assigne':     2,
  'Pending':     4,
  'En attente':  4,
  'Planned':     3,
  'Planifié':    3,
  'Planifie':    3,
  'Solved':      5,
  'Resolved':    5,
  'Résolu':      5,
  'Resolu':      5,
  'Closed':      6,
  'Clos':        6,
};

const TICKET_PRIORITY_MAP = {
  'Very Low':  1,
  'Très basse': 1,
  'Tres basse': 1,
  'Low':       2,
  'Basse':     2,
  'Medium':    3,
  'Moyenne':   3,
  'High':      4,
  'Haute':     4,
  'Very High': 5,
  'Très haute': 5,
  'Tres haute': 5,
  'Critical':  5,
  'Critique':  5,
  'Major':     6,
  'Majeure':   6,
};

const TICKET_TYPE_MAP = {
  'Incident': 1,
  'Request':  2,
  'Demande':  2,
};

const ITEMTYPE_MAP = {
  // Anglais (Noms des classes GLPI)
  'Computer': 'Computer',
  'Monitor':  'Monitor',
  'Printer':  'Printer',
  'Phone':    'Phone',
  'Software': 'Software',
  'NetworkEquipment': 'NetworkEquipment',
  'Peripheral': 'Peripheral',
  'UninterruptiblePowerSupply': 'UninterruptiblePowerSupply',
  'Rack': 'Rack',
  'Database': 'Database',
  'Chassis': 'Enclosure',
  'Enclosure': 'Enclosure',
  'Appliance': 'Appliance',
  'PassiveDCEquipment': 'PassiveDCEquipment',
  'CartridgeItem': 'CartridgeItem',
  'PDU': 'PDU',
  'Cable': 'Cable',
  'ConsumableItem': 'ConsumableItem',

  // Français (Traduction depuis le CSV)
  'Ordinateur': 'Computer',
  'Moniteur': 'Monitor',
  'Imprimante': 'Printer',
  'Téléphone': 'Phone',
  'Telephone': 'Phone',
  'Logiciel': 'Software',
  'Matériel réseau': 'NetworkEquipment',
  'Materiel reseau': 'NetworkEquipment',
  'Réseau': 'NetworkEquipment',
  'Reseau': 'NetworkEquipment',
  'Périphérique': 'Peripheral',
  'Peripherique': 'Peripheral',
  'Onduleur': 'UninterruptiblePowerSupply',
  'Onduleur / PDU': 'UninterruptiblePowerSupply',
  'Baie': 'Rack',
  'Baie (Enclosure)': 'Rack',
  'Baies (Enclosure)': 'Rack',
  'Base de données': 'Database',
  'Base de donnees': 'Database',
  'Châssis': 'Enclosure',
  'Chassis (Enclosure)': 'Enclosure',
  'Dispositif': 'Appliance',
  'PassiveDCEquipment': 'PassiveDCEquipment',
  'CartridgeItem': 'CartridgeItem',
  'PDU': 'PDU',
  'Cable': 'Cable',
  'ConsumableItem': 'ConsumableItem',
  'Câble': 'Cable',
  'Cartouche': 'CartridgeItem',
  'Consommable': 'ConsumableItem',
  'Equipement passif': 'PassiveDCEquipment',
  'Équip. Passif': 'PassiveDCEquipment',
  'Equip. Passif': 'PassiveDCEquipment',
};

const BATCH_SIZE = 10;

async function runInBatches(items, asyncFn, onProgress) {
  const results = [];
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(batch.map(asyncFn));
    results.push(...batchResults);
    if (onProgress) onProgress(Math.min(i + BATCH_SIZE, items.length), items.length);
  }
  return results;
}

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve({ data: result.data, fields: result.meta.fields || [] }),
      error: (err) => reject(new Error(`Erreur parsing CSV "${file.name}": ${err.message}`)),
    });
  });
}

function sanitizeNumber(val) {
  if (val === null || val === undefined || val === '') return 0;
  return parseFloat(String(val).replace(',', '.')) || 0;
}

function buildDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  const time = timeStr ? timeStr.trim() : '00:00';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time}:00`;
}

/** Parse sécurisé de la colonne Items (ex: ["PC-ADM-001","MN-FORM-002"]) */
function parseItemsColumn(raw) {
  if (!raw || raw.trim() === '') return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null; // invalide
    return parsed.map((s) => String(s).trim());
  } catch {
    // Tentative de nettoyage manuel
    try {
      const cleaned = raw.replace(/["']/g, '"').trim();
      return JSON.parse(cleaned);
    } catch {
      return null; // impossible à parser
    }
  }
}

/** Récupère TOUTES les entrées d'un endpoint GLPI (paginé) */
async function fetchAllGlpi(endpoint) {
  const limit = 500;
  let start = 0;
  let all = [];
  while (true) {
    const data = await fetchDataAPIRest(`${endpoint}?range=${start}-${start + limit - 1}`);
    if (!data || !Array.isArray(data) || data.length === 0) break;
    all = all.concat(data);
    if (data.length < limit) break;
    start += limit;
  }
  return all;
}

/**
 * Convertit un Blob image en JPEG via Canvas.
 * Contourne les problèmes d'upload PNG sur certaines configs GLPI.
 */
function convertToJpeg(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF'; // fond blanc pour les PNGs transparents
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((jpegBlob) => {
          URL.revokeObjectURL(url);
          if (jpegBlob) resolve(jpegBlob);
          else reject(new Error('canvas.toBlob retourné null'));
        }, 'image/jpeg', 0.92);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossible de charger l\'image pour conversion'));
    };
    img.src = url;
  });
}

/** Construit un dict name.toLowerCase() -> id depuis une liste GLPI */
function buildDict(list, nameField = 'name') {
  const dict = {};
  for (const item of list) {
    if (item[nameField]) {
      dict[item[nameField].toLowerCase().trim()] = item.id;
    }
  }
  return dict;
}

// ─────────────────────────────────────────────
// PHASE 1 : EXTRACTION & NETTOYAGE
// ─────────────────────────────────────────────

export async function phase1_extract(csvEquipements, csvTickets, csvCouts, zipFile) {
  const [resEquip, resTickets, resCouts] = await Promise.all([
    csvEquipements ? parseCsv(csvEquipements) : Promise.resolve({ data: [], fields: [] }),
    csvTickets ? parseCsv(csvTickets) : Promise.resolve({ data: [], fields: [] }),
    csvCouts ? parseCsv(csvCouts) : Promise.resolve({ data: [], fields: [] }),
  ]);

  const rawEquip = resEquip.data;
  const rawTickets = resTickets.data;
  const rawCouts = resCouts.data;

  const headersEquip = resEquip.fields || [];
  const headersTickets = resTickets.fields || [];
  const headersCouts = resCouts.fields || [];

  // Lire le ZIP et indexer par nom d'équipement si fourni
  const images = {}; // { "PC-ADM-001": File }
  if (zipFile) {
    const zip = await JSZip.loadAsync(zipFile);
    const imgPromises = [];
    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;
      const filename = relativePath.split('/').pop();
      const ext = filename.split('.').pop().toLowerCase();
      const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
      const isJpeg = ext === 'jpg' || ext === 'jpeg';

      imgPromises.push(
        zipEntry.async('arraybuffer').then(async (buffer) => {
          const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
          const rawBlob = new Blob([buffer], { type: mimeType });

          // Convertir PNG/GIF/WebP en JPEG pour garantir un upload fiable
          if (!isJpeg) {
            try {
              const jpegBlob = await convertToJpeg(rawBlob);
              const jpegFilename = nameWithoutExt.trim() + '.jpeg';
              images[nameWithoutExt.trim()] = { blob: jpegBlob, filename: jpegFilename };
            } catch (convErr) {
              console.warn(`Conversion JPEG échouée pour ${filename}, upload PNG natif:`, convErr);
              images[nameWithoutExt.trim()] = { blob: rawBlob, filename };
            }
          } else {
            images[nameWithoutExt.trim()] = { blob: rawBlob, filename };
          }
        })
      );
    });
    await Promise.all(imgPromises);
  }

  // Nettoyage Feuille 1 (Équipements)
  const equipements = rawEquip.map((row, idx) => ({
    _rowNum: idx + 2,
    name: row['Name']?.trim() || '',
    status: row['Status']?.trim() || '',
    location: row['Location']?.trim() || '',
    manufacturer: row['Manufacturer']?.trim() || '',
    itemType: row['Item_Type']?.trim() || '',
    model: row['Model']?.trim() || '',
    inventoryNumber: row['Inventory_Number']?.trim() || '',
    user: row['User']?.trim() || '',
  }));

  // Nettoyage Feuille 2 (Tickets)
  const tickets = rawTickets.map((row, idx) => {
    const itemsParsed = parseItemsColumn(row['Items']);
    return {
      _rowNum: idx + 2,
      refTicket: row['Ref_Ticket']?.trim() || '',
      dateTime: buildDateTime(row['Date']?.trim(), row['Heure']?.trim()),
      rawDate: row['Date']?.trim() || '',
      rawHeure: row['Heure']?.trim() || '',
      type: row['Type']?.trim() || '',
      titre: row['Titre']?.trim() || '',
      description: row['Description']?.trim() || '',
      status: row['Status']?.trim() || '',
      priority: row['Priority']?.trim() || '',
      items: itemsParsed, // null si parsing raté, [] si vide, tableau sinon
    };
  });

  // Nettoyage Feuille 3 (Coûts)
  const couts = rawCouts.map((row, idx) => ({
    _rowNum: idx + 2,
    numTicket: row['Num_Ticket']?.trim() || '',
    durationSeconds: sanitizeNumber(row['Duration_second']),
    timeCost: sanitizeNumber(row['Time_Cost']),
    fixedCost: sanitizeNumber(row['Fixed_Cost']),
    rawDuration: row['Duration_second']?.trim() || '',
    rawTimeCost: row['Time_Cost']?.trim() || '',
    rawFixedCost: row['Fixed_Cost']?.trim() || '',
  }));

  equipements.headers = headersEquip;
  tickets.headers = headersTickets;
  couts.headers = headersCouts;

  return { equipements, tickets, couts, images };
}

// ─────────────────────────────────────────────
// PHASE 2 : DRY RUN (Validation, aucun POST)
// ─────────────────────────────────────────────

export async function phase2_dryRun(equipements, tickets, couts, onLog) {
  const errors = [];
  const log = (msg) => onLog && onLog(msg);

  // 1. Validation des en-têtes correspondants
  const headersEquip = equipements.headers || [];
  const headersTickets = tickets.headers || [];
  const headersCouts = couts.headers || [];

  const expectedEquip = ['Name', 'Status', 'Location', 'Manufacturer', 'Item_Type', 'Model', 'Inventory_Number', 'User'];
  const expectedTickets = ['Ref_Ticket', 'Date', 'Heure', 'Type', 'Titre', 'Description', 'Status', 'Priority', 'Items'];
  const expectedCouts = ['Num_Ticket', 'Duration_second', 'Time_Cost', 'Fixed_Cost'];

  const validateHeaders = (fileLabel, actualHeaders, expectedHeaders) => {
    if (actualHeaders.length === 0) return;
    const missing = expectedHeaders.filter(h => !actualHeaders.includes(h));
    if (missing.length > 0) {
      errors.push(`${fileLabel} : En-tête(s) manquant(s) ou incorrect(s) : ${missing.join(', ')}. Colonnes attendues : ${expectedHeaders.join(', ')}.`);
    }
  };

  validateHeaders('Feuille 1 (Équipements)', headersEquip, expectedEquip);
  validateHeaders('Feuille 2 (Tickets)', headersTickets, expectedTickets);
  validateHeaders('Feuille 3 (Coûts)', headersCouts, expectedCouts);

  log('🔍 Vérification des doublons locaux (Feuille 1)...');

  // Doublons sur Inventory_Number
  const inventoryNums = equipements.map((e) => e.inventoryNumber).filter(Boolean);
  const dupInventory = inventoryNums.filter((v, i) => inventoryNums.indexOf(v) !== i);
  if (dupInventory.length > 0) {
    errors.push(`Doublons de numéros d'inventaire dans la Feuille 1 : ${[...new Set(dupInventory)].join(', ')}`);
  }

  // Doublons sur Name (Avertissement simple, non bloquant)
  const names = equipements.map((e) => e.name).filter(Boolean);
  const dupNames = names.filter((v, i) => names.indexOf(v) !== i);
  if (dupNames.length > 0) {
    log(`⚠️ Avertissement : Doublons de noms d'équipement dans la Feuille 1 : ${[...new Set(dupNames)].join(', ')}. Les liaisons de tickets associeront la dernière instance importée.`);
  }

  // Doublons sur Ref_Ticket
  const refTickets = tickets.map((t) => t.refTicket).filter(Boolean);
  const dupRefTickets = refTickets.filter((v, i) => refTickets.indexOf(v) !== i);
  if (dupRefTickets.length > 0) {
    errors.push(`Doublons de Ref_Ticket dans la Feuille 2 : ${[...new Set(dupRefTickets)].join(', ')}`);
  }

  log('🔍 Validation des champs obligatoires...');

  // Validation Feuille 1
  for (const e of equipements) {
    if (!e.name) errors.push(`Feuille 1, ligne ${e._rowNum} : Champ "Name" manquant.`);
    if (!e.itemType) errors.push(`Feuille 1, ligne ${e._rowNum} : Champ "Item_Type" manquant.`);
    if (e.itemType && !ITEMTYPE_MAP[e.itemType]) {
      errors.push(`Feuille 1, ligne ${e._rowNum} : Item_Type "${e.itemType}" non supporté. Valeurs acceptées : ${Object.keys(ITEMTYPE_MAP).join(', ')}.`);
    }
  }

  // Helpers pour les formats de date / heure
  const isValidDateFormat = (dateStr) => {
    if (!dateStr) return false;
    const parts = dateStr.split('/');
    if (parts.length !== 3) return false;
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    const y = parseInt(parts[2], 10);
    if (isNaN(d) || isNaN(m) || isNaN(y)) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    if (y < 1900 || y > 2100) return false;
    return true;
  };

  const isValidTimeFormat = (timeStr) => {
    if (!timeStr) return true; // optionnel
    const parts = timeStr.split(':');
    if (parts.length !== 2) return false;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return false;
    if (h < 0 || h > 23) return false;
    if (m < 0 || m > 59) return false;
    return true;
  };

  // Validation Feuille 2
  const equipNameSet = new Set(equipements.map((e) => e.name));
  for (const t of tickets) {
    // 2. Validation Ref_Ticket > 0
    const refNum = parseInt(t.refTicket, 10);
    if (!t.refTicket || isNaN(refNum) || refNum <= 0) {
      errors.push(`Feuille 2, ligne ${t._rowNum} : Le champ Ref_Ticket doit être un nombre entier supérieur à 0 ("${t.refTicket || ''}").`);
    }

    if (!t.titre) errors.push(`Feuille 2, ligne ${t._rowNum} : Champ "Titre" manquant.`);
    
    // 3. Validation format date
    if (!isValidDateFormat(t.rawDate)) {
      errors.push(`Feuille 2, ligne ${t._rowNum} : Format de Date invalide ("${t.rawDate || ''}"). Format attendu : DD/MM/YYYY.`);
    }
    if (t.rawHeure && !isValidTimeFormat(t.rawHeure)) {
      errors.push(`Feuille 2, ligne ${t._rowNum} : Format d'Heure invalide ("${t.rawHeure || ''}"). Format attendu : HH:mm.`);
    }

    if (t.type && TICKET_TYPE_MAP[t.type] === undefined) {
      errors.push(`Feuille 2, ligne ${t._rowNum} : Type "${t.type}" invalide. Valeurs : Incident, Request.`);
    }
    if (t.status && TICKET_STATUS_MAP[t.status] === undefined) {
      errors.push(`Feuille 2, ligne ${t._rowNum} : Status ticket "${t.status}" invalide.`);
    }
    if (t.priority && TICKET_PRIORITY_MAP[t.priority] === undefined) {
      errors.push(`Feuille 2, ligne ${t._rowNum} : Priority "${t.priority}" invalide.`);
    }
    if (t.items === null) {
      errors.push(`Feuille 2, ligne ${t._rowNum} : Colonne "Items" impossible à parser. Vérifiez le format JSON.`);
    } else if (Array.isArray(t.items)) {
      for (const itemName of t.items) {
        if (equipements.length > 0 && !equipNameSet.has(itemName)) {
          errors.push(`Feuille 2, ligne ${t._rowNum} : L'équipement "${itemName}" (Items) n'existe pas dans la Feuille 1.`);
        }
      }
    }
  }

  // Validation Feuille 3 (références croisées et montants)
  const refTicketSet = new Set(refTickets);
  for (const c of couts) {
    // 2. Validation Num_Ticket > 0
    const numTicketVal = parseInt(c.numTicket, 10);
    if (!c.numTicket || isNaN(numTicketVal) || numTicketVal <= 0) {
      errors.push(`Feuille 3, ligne ${c._rowNum} : Le champ Num_Ticket doit être un nombre entier supérieur à 0 ("${c.numTicket || ''}").`);
    } else if (tickets.length > 0 && !refTicketSet.has(c.numTicket)) {
      errors.push(`Feuille 3, ligne ${c._rowNum} : Num_Ticket "${c.numTicket}" ne correspond à aucun Ref_Ticket de la Feuille 2.`);
    }

    // 4. Validation montant doit être positif
    const durationVal = parseFloat(String(c.rawDuration).replace(',', '.'));
    if (c.rawDuration !== '' && (isNaN(durationVal) || durationVal < 0)) {
      errors.push(`Feuille 3, ligne ${c._rowNum} : La durée Duration_second doit être un nombre positif ou nul ("${c.rawDuration}").`);
    }

    const timeVal = parseFloat(String(c.rawTimeCost).replace(',', '.'));
    if (c.rawTimeCost !== '' && (isNaN(timeVal) || timeVal < 0)) {
      errors.push(`Feuille 3, ligne ${c._rowNum} : Le montant Time_Cost doit être un nombre positif ou nul ("${c.rawTimeCost}").`);
    }

    const fixedVal = parseFloat(String(c.rawFixedCost).replace(',', '.'));
    if (c.rawFixedCost !== '' && (isNaN(fixedVal) || fixedVal < 0)) {
      errors.push(`Feuille 3, ligne ${c._rowNum} : Le montant Fixed_Cost doit être un nombre positif ou nul ("${c.rawFixedCost}").`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // ── Récupération des dictionnaires GLPI ──
  log('🌐 Récupération des dictionnaires GLPI...');

  let locations, manufacturers, states, users, computerModels, computerTypes, monitorModels, monitorTypes, docTypes;
  try {
    [
      locations,
      manufacturers,
      states,
      users,
      computerModels,
      computerTypes,
      monitorModels,
      monitorTypes,
      docTypes
    ] = await Promise.all([
      fetchAllGlpi('Location'),
      fetchAllGlpi('Manufacturer'),
      fetchAllGlpi('State'),
      fetchAllGlpi('User'),
      fetchAllGlpi('ComputerModel'),
      fetchAllGlpi('ComputerType'),
      fetchAllGlpi('MonitorModel'),
      fetchAllGlpi('MonitorType'),
      fetchAllGlpi('DocumentType'),
    ]);
    log('📄 Types de documents autorisés dans GLPI : ' + docTypes.map(d => `${d.name} (.${d.ext})`).join(', '));
  } catch (e) {
    return { valid: false, errors: [`Impossible de récupérer les dictionnaires GLPI : ${e.message}`] };
  }

  const locationDict = buildDict(locations);
  const manufacturerDict = buildDict(manufacturers);
  const stateDict = buildDict(states);
  
  const userDict = {};
  for (const user of users) {
    if (user.name) {
      userDict[user.name.toLowerCase().trim()] = user.id;
    }
    const fn = (user.firstname || '').trim();
    const ln = (user.realname || '').trim();
    if (fn && ln) {
      userDict[`${fn} ${ln}`.toLowerCase()] = user.id;
      userDict[`${ln} ${fn}`.toLowerCase()] = user.id;
    } else if (fn) {
      userDict[fn.toLowerCase()] = user.id;
    } else if (ln) {
      userDict[ln.toLowerCase()] = user.id;
    }
  }

  const computerModelDict = buildDict(computerModels);
  const computerTypeDict = buildDict(computerTypes);
  const monitorModelDict = buildDict(monitorModels);
  const monitorTypeDict = buildDict(monitorTypes);



  log('🔍 Vérification correspondances CSV ↔ GLPI (auto-création si manquant)...');

  // Auto-création des Locations manquantes
  const uniqueLocations = [...new Set(equipements.map((e) => e.location).filter(Boolean))];
  for (const locName of uniqueLocations) {
    if (locationDict[locName.toLowerCase()] === undefined) {
      log(`  → Création du lieu manquant : "${locName}"`);
      try {
        const res = await fetchDataAPIRest('Location', {
          method: 'POST',
          body: { input: { name: locName } },
        });
        if (res && res.id) {
          locationDict[locName.toLowerCase()] = res.id;
          log(`    ✅ Lieu "${locName}" créé (id: ${res.id})`);
        } else {
          errors.push(`Impossible de créer le lieu "${locName}" dans GLPI.`);
        }
      } catch (e) {
        errors.push(`Erreur lors de la création du lieu "${locName}" : ${e.message}`);
      }
    }
  }

  // Auto-création des Manufacturers manquants
  const uniqueManufacturers = [...new Set(equipements.map((e) => e.manufacturer).filter(Boolean))];
  for (const mfName of uniqueManufacturers) {
    if (manufacturerDict[mfName.toLowerCase()] === undefined) {
      log(`  → Création du fabricant manquant : "${mfName}"`);
      try {
        const res = await fetchDataAPIRest('Manufacturer', {
          method: 'POST',
          body: { input: { name: mfName } },
        });
        if (res && res.id) {
          manufacturerDict[mfName.toLowerCase()] = res.id;
          log(`    ✅ Fabricant "${mfName}" créé (id: ${res.id})`);
        } else {
          errors.push(`Impossible de créer le fabricant "${mfName}" dans GLPI.`);
        }
      } catch (e) {
        errors.push(`Erreur lors de la création du fabricant "${mfName}" : ${e.message}`);
      }
    }
  }

  // Auto-création des States manquants
  const uniqueStates = [...new Set(equipements.map((e) => e.status).filter(Boolean))];
  for (const stateName of uniqueStates) {
    if (stateDict[stateName.toLowerCase()] === undefined) {
      log(`  → Création de l'état manquant : "${stateName}"`);
      try {
        const res = await fetchDataAPIRest('State', {
          method: 'POST',
          body: { input: { name: stateName } },
        });
        if (res && res.id) {
          stateDict[stateName.toLowerCase()] = res.id;
          log(`    ✅ État "${stateName}" créé (id: ${res.id})`);
        } else {
          errors.push(`Impossible de créer l'état "${stateName}" dans GLPI.`);
        }
      } catch (e) {
        errors.push(`Erreur lors de la création de l'état "${stateName}" : ${e.message}`);
      }
    }
  }

  // Auto-création des Models manquants (Computer & Monitor)
  for (const e of equipements) {
    if (!e.model) continue;
    if (e.itemType === 'Computer') {
      if (computerModelDict[e.model.toLowerCase()] === undefined) {
        log(`  → Création du modèle d'ordinateur manquant : "${e.model}"`);
        try {
          const res = await fetchDataAPIRest('ComputerModel', {
            method: 'POST',
            body: { input: { name: e.model } },
          });
          if (res && res.id) {
            computerModelDict[e.model.toLowerCase()] = res.id;
            log(`    ✅ Modèle d'ordinateur "${e.model}" créé (id: ${res.id})`);
          } else {
            errors.push(`Impossible de créer le modèle d'ordinateur "${e.model}" dans GLPI.`);
          }
        } catch (err) {
          errors.push(`Erreur lors de la création du modèle d'ordinateur "${e.model}" : ${err.message}`);
        }
      }
    } else if (e.itemType === 'Monitor') {
      if (monitorModelDict[e.model.toLowerCase()] === undefined) {
        log(`  → Création du modèle d'écran manquant : "${e.model}"`);
        try {
          const res = await fetchDataAPIRest('MonitorModel', {
            method: 'POST',
            body: { input: { name: e.model } },
          });
          if (res && res.id) {
            monitorModelDict[e.model.toLowerCase()] = res.id;
            log(`    ✅ Modèle d'écran "${e.model}" créé (id: ${res.id})`);
          } else {
            errors.push(`Impossible de créer le modèle d'écran "${e.model}" dans GLPI.`);
          }
        } catch (err) {
          errors.push(`Erreur lors de la création du modèle d'écran "${e.model}" : ${err.message}`);
        }
      }
    }
  }

  // Auto-création des Types manquants (Computer & Monitor)
  const uniqueItemTypes = [...new Set(equipements.map((e) => e.itemType).filter(Boolean))];
  for (const typeName of uniqueItemTypes) {
    if (typeName === 'Computer') {
      if (computerTypeDict[typeName.toLowerCase()] === undefined) {
        log(`  → Création du type d'ordinateur manquant : "${typeName}"`);
        try {
          const res = await fetchDataAPIRest('ComputerType', {
            method: 'POST',
            body: { input: { name: typeName } },
          });
          if (res && res.id) {
            computerTypeDict[typeName.toLowerCase()] = res.id;
            log(`    ✅ Type d'ordinateur "${typeName}" créé (id: ${res.id})`);
          } else {
            errors.push(`Impossible de créer le type d'ordinateur "${typeName}" dans GLPI.`);
          }
        } catch (err) {
          errors.push(`Erreur lors de la création du type d'ordinateur "${typeName}" : ${err.message}`);
        }
      }
    } else if (typeName === 'Monitor') {
      if (monitorTypeDict[typeName.toLowerCase()] === undefined) {
        log(`  → Création du type d'écran manquant : "${typeName}"`);
        try {
          const res = await fetchDataAPIRest('MonitorType', {
            method: 'POST',
            body: { input: { name: typeName } },
          });
          if (res && res.id) {
            monitorTypeDict[typeName.toLowerCase()] = res.id;
            log(`    ✅ Type d'écran "${typeName}" créé (id: ${res.id})`);
          } else {
            errors.push(`Impossible de créer le type d'écran "${typeName}" dans GLPI.`);
          }
        } catch (err) {
          errors.push(`Erreur lors de la création du type d'écran "${typeName}" : ${err.message}`);
        }
      }
    }
  }

  // Auto-création des Users manquants
  const uniqueUsers = [...new Set(equipements.map((e) => e.user).filter(Boolean))];
  for (const userName of uniqueUsers) {
    if (userDict[userName.toLowerCase()] === undefined) {
      log(`  → Création de l'utilisateur manquant : "${userName}"`);
      try {
        const parts = userName.split(/\s+/);
        let firstname = '';
        let realname = userName;
        let login = userName.toLowerCase().replace(/[^a-z0-9]/g, '.');
        if (parts.length >= 2) {
          realname = parts[0];
          firstname = parts.slice(1).join(' ');
        }
        
        const res = await fetchDataAPIRest('User', {
          method: 'POST',
          body: {
            input: {
              name: login,
              realname: realname,
              firstname: firstname,
            }
          },
        });
        if (res && res.id) {
          userDict[userName.toLowerCase()] = res.id;
          log(`    ✅ Utilisateur "${userName}" créé (id: ${res.id})`);
        } else {
          errors.push(`Impossible de créer l'utilisateur "${userName}" dans GLPI.`);
        }
      } catch (e) {
        errors.push(`Erreur lors de la création de l'utilisateur "${userName}" : ${e.message}`);
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  log('✅ Dry Run validé. Toutes les données sont conformes.');
  return {
    valid: true,
    errors: [],
    dicts: {
      locationDict,
      manufacturerDict,
      stateDict,
      userDict,
      computerModelDict,
      computerTypeDict,
      monitorModelDict,
      monitorTypeDict,
    },
  };
}

// ─────────────────────────────────────────────
// PHASE 3 : IMPORT BULK + TRACKING
// ─────────────────────────────────────────────

export async function phase3_import(equipements, tickets, couts, images, dicts, onLog, onProgress) {
  const {
    locationDict,
    manufacturerDict,
    stateDict,
    userDict,
    computerModelDict,
    computerTypeDict,
    monitorModelDict,
    monitorTypeDict,
  } = dicts;

  // Registre de tous les éléments créés pour le rollback
  const created = {
    computers: [],   // { id }
    monitors: [],
    printers: [],
    phones: [],
    softwares: [],
    networks: [],
    peripherals: [],
    ups: [],
    racks: [],
    databases: [],
    chassis: [],
    enclosures: [],
    appliances: [],
    passivedcequipments: [],
    cartridgeitems: [],
    pdus: [],
    cables: [],
    consumableitems: [],
    equipments: [], // 🟢 Registre générique pour le rollback universel
    tickets: [],     // { id }
    ticketTasks: [], // { id }
    ticketCosts: [], // 🟢 NOUVEAU: Ajout du tracking des TicketCosts
    documents: [],   // { id }
  };

  const log = (msg) => onLog && onLog(msg);

  // Caches et helpers pour la création dynamique des types/modèles
  const typeCache = {};
  const modelCache = {};

  if (computerTypeDict) {
    Object.entries(computerTypeDict).forEach(([name, id]) => {
      typeCache[`Computer_${name.trim().toLowerCase()}`] = id;
    });
  }
  if (monitorTypeDict) {
    Object.entries(monitorTypeDict).forEach(([name, id]) => {
      typeCache[`Monitor_${name.trim().toLowerCase()}`] = id;
    });
  }
  if (computerModelDict) {
    Object.entries(computerModelDict).forEach(([name, id]) => {
      modelCache[`Computer_${name.trim().toLowerCase()}`] = id;
    });
  }
  if (monitorModelDict) {
    Object.entries(monitorModelDict).forEach(([name, id]) => {
      modelCache[`Monitor_${name.trim().toLowerCase()}`] = id;
    });
  }

  async function getOrCreateType(itemType, typeName) {
    if (!typeName) return 0;
    const cacheKey = `${itemType}_${typeName.toLowerCase().trim()}`;
    if (typeCache[cacheKey] !== undefined) return typeCache[cacheKey];
    const glpiTypeClass = `${itemType}Type`;
    try {
      const existing = await fetchDataAPIRest(glpiTypeClass).catch(() => []);
      const found = Array.isArray(existing) ? existing.find(t => t.name.toLowerCase().trim() === typeName.toLowerCase().trim()) : null;
      if (found) {
        typeCache[cacheKey] = found.id;
        return found.id;
      }
      const res = await fetchDataAPIRest(glpiTypeClass, {
        method: 'POST',
        body: { input: { name: typeName } }
      });
      if (res && res.id) {
        typeCache[cacheKey] = res.id;
        log(`    ✅ Type "${typeName}" créé pour ${itemType} (id: ${res.id})`);
        return res.id;
      }
    } catch (e) {
      console.warn(`Could not get/create Type for ${itemType} (using class ${glpiTypeClass}):`, e.message);
    }
    typeCache[cacheKey] = 0;
    return 0;
  }

  async function getOrCreateModel(itemType, modelName) {
    if (!modelName) return 0;
    const cacheKey = `${itemType}_${modelName.toLowerCase().trim()}`;
    if (modelCache[cacheKey] !== undefined) return modelCache[cacheKey];
    const glpiModelClass = `${itemType}Model`;
    try {
      const existing = await fetchDataAPIRest(glpiModelClass).catch(() => []);
      const found = Array.isArray(existing) ? existing.find(m => m.name.toLowerCase().trim() === modelName.toLowerCase().trim()) : null;
      if (found) {
        modelCache[cacheKey] = found.id;
        return found.id;
      }
      const res = await fetchDataAPIRest(glpiModelClass, {
        method: 'POST',
        body: { input: { name: modelName } }
      });
      if (res && res.id) {
        modelCache[cacheKey] = res.id;
        log(`    ✅ Modèle "${modelName}" créé pour ${itemType} (id: ${res.id})`);
        return res.id;
      }
    } catch (e) {
      console.warn(`Could not get/create Model for ${itemType} (using class ${glpiModelClass}):`, e.message);
    }
    modelCache[cacheKey] = 0;
    return 0;
  }

  // Helper POST sécurisé : lance une erreur si statut != 2xx
  async function safePost(endpoint, body) {
    const result = await fetchDataAPIRest(endpoint, { method: 'POST', body });
    if (!result || result.id === undefined) {
      throw new Error(`POST ${endpoint} : réponse inattendue → ${JSON.stringify(result)}`);
    }
    return result;
  }

  try {
    // 🔍 DIAGNOSTIC DES PROFILS GLPI
    try {
      const profilesRes = await fetchDataAPIRest('getMyProfiles');
      const rawProfiles = profilesRes.myprofiles || [];
      const profiles = Array.isArray(rawProfiles) ? rawProfiles : Object.values(rawProfiles);
      log(`👤 Profils dispo : ${profiles.map(p => `${p.name} (id:${p.id})`).join(', ')}`);
      
      const activeRes = await fetchDataAPIRest('getActiveProfile');
      log(`🔑 Profil actif : ${activeRes.active_profile?.name || 'Inconnu'} (id: ${activeRes.active_profile?.id})`);
    } catch (diagErr) {
      log(`⚠️ Diagnostic Profils échoué : ${diagErr.message}`);
    }

    // ── ÉTAPE 1 : Équipements ──
    log('📦 Import des équipements...');
    const equipNameToGlpi = {}; // "PC-ADM-001" -> { id, itemtype }

    // Grouper par type
    const byType = {};
    for (const e of equipements) {
      if (!byType[e.itemType]) byType[e.itemType] = [];
      byType[e.itemType].push(e);
    }

    for (const [itemType, items] of Object.entries(byType)) {
      const endpoint = itemType; // ex: "Computer", "Monitor", "NetworkEquipment"

      await runInBatches(items, async (e) => {
        const payload = {
          input: {
            name: e.name,
            serial: e.inventoryNumber,
            otherserial: e.inventoryNumber,
            states_id: e.status ? (stateDict[e.status.toLowerCase()] ?? 0) : 0,
            locations_id: e.location ? (locationDict[e.location.toLowerCase()] ?? 0) : 0,
            manufacturers_id: e.manufacturer ? (manufacturerDict[e.manufacturer.toLowerCase()] ?? 0) : 0,
            users_id: e.user ? (userDict[e.user.toLowerCase()] ?? 0) : 0,
          },
        };

        const typeFieldName = `${itemType.toLowerCase()}types_id`;
        const modelFieldName = `${itemType.toLowerCase()}models_id`;

        const typeId = await getOrCreateType(itemType, itemType);
        const modelId = e.model ? await getOrCreateModel(itemType, e.model) : 0;

        if (typeId > 0) {
          payload.input[typeFieldName] = typeId;
        }
        if (modelId > 0) {
          payload.input[modelFieldName] = modelId;
        }

        const res = await safePost(endpoint, payload);
        created.equipments.push({ id: res.id, itemtype: itemType });

        const uiKeyMap = {
          'Computer': 'computers',
          'Monitor': 'monitors',
          'Printer': 'printers',
          'Phone': 'phones',
          'Software': 'softwares',
          'NetworkEquipment': 'networks',
          'Peripheral': 'peripherals',
          'UninterruptiblePowerSupply': 'ups',
          'Rack': 'racks',
          'Database': 'databases',
          'Enclosure': 'enclosures',
          'Appliance': 'appliances',
          'PassiveDCEquipment': 'passivedcequipments',
          'CartridgeItem': 'cartridgeitems',
          'PDU': 'pdus',
          'Cable': 'cables',
          'ConsumableItem': 'consumableitems',
        };
        const uiKey = uiKeyMap[itemType];
        if (uiKey && created[uiKey]) {
          created[uiKey].push({ id: res.id });
        }

        equipNameToGlpi[e.name] = { id: res.id, itemtype: itemType };
      }, (done, total) => {
        log(`  → ${itemType} : ${done}/${total}`);
        onProgress && onProgress();
      });
    }

    // ── ÉTAPE 2 : Tickets ──
    log('🎫 Import des tickets...');
    const refToGlpiTicketId = {}; // "1" -> 42 (ID GLPI)
    const ticketsToUpdateStatus = []; // { id, status }

    await runInBatches(tickets, async (t) => {
      const targetStatus = TICKET_STATUS_MAP[t.status] ?? 1;
      // Si le statut final est planifié (3), en attente (4), résolu (5) ou clos (6), on le crée temporairement en "En cours" (2)
      // pour permettre la liaison d'éléments (Item_Ticket) et l'ajout de tâches/coûts
      const initialStatus = (targetStatus === 3 || targetStatus === 4 || targetStatus === 5 || targetStatus === 6) ? 2 : targetStatus;

      const payload = {
        input: {
          name: t.titre,
          content: t.description,
          date: t.dateTime,
          date_creation: t.dateTime,
          type: TICKET_TYPE_MAP[t.type] ?? 1,
          status: initialStatus,
          priority: TICKET_PRIORITY_MAP[t.priority] ?? 3,
          urgency: TICKET_PRIORITY_MAP[t.priority] ?? 3,
          impact: TICKET_PRIORITY_MAP[t.priority] ?? 3,
        },
      };
      const res = await safePost('Ticket', payload);
      created.tickets.push({ id: res.id });
      refToGlpiTicketId[t.refTicket] = res.id;

      if (targetStatus === 3 || targetStatus === 4 || targetStatus === 5 || targetStatus === 6) {
        ticketsToUpdateStatus.push({ id: res.id, status: targetStatus, date: t.dateTime });
      }
    }, (done, total) => {
      log(`  → Tickets : ${done}/${total}`);
      onProgress && onProgress();
    });

    // ── ÉTAPE 3 : Relations Item_Ticket ──
    log('🔗 Liaison équipements ↔ tickets...');
    const ticketItemRelations = [];
    for (const t of tickets) {
      const ticketGlpiId = refToGlpiTicketId[t.refTicket];
      if (!ticketGlpiId || !t.items || t.items.length === 0) continue;
      for (const itemName of t.items) {
        const glpiItem = equipNameToGlpi[itemName];
        if (!glpiItem) continue;
        ticketItemRelations.push({ ticketId: ticketGlpiId, itemId: glpiItem.id, itemtype: glpiItem.itemtype });
      }
    }

    await runInBatches(ticketItemRelations, async (rel) => {
      try {
        await fetchDataAPIRest('Item_Ticket', {
          method: 'POST',
          body: {
            input: [
              {
                tickets_id: rel.ticketId,
                items_id: rel.itemId,
                itemtype: rel.itemtype,
              }
            ]
          },
        });
      } catch (err) {
        log(`⚠️ Liaison ignorée (${rel.itemtype} ID ${rel.itemId} ↔ Ticket ID ${rel.ticketId}) : ${err.message}`);
      }
    }, (done, total) => {
      log(`  → Relations : ${done}/${total}`);
      onProgress && onProgress();
    });

    // ── ÉTAPE 4 : Tâches/Coûts (Feuille 3) ──
    log('💰 Import des tâches et coûts...');
    await runInBatches(couts, async (c) => {
      const ticketGlpiId = refToGlpiTicketId[c.numTicket];
      if (!ticketGlpiId) return;

      try {
        // 1. Création SYMÉTRIQUE de la tâche (même à 0s) pour conserver l'alignement des index
        const taskRes = await safePost('TicketTask', {
          input: {
            tickets_id: ticketGlpiId,
            actiontime: c.durationSeconds,
            content: `Tâche importée - Temps passé: ${c.durationSeconds}s`,
          },
        });
        created.ticketTasks.push({ id: taskRes.id });
      } catch (err) {
        log(`⚠️ Tâche ignorée pour le ticket ID ${ticketGlpiId} : ${err.message}`);
      }

      try {
        // 2. Création du Coût financier associé sur la même ligne
        const costRes = await safePost('TicketCost', {
          input: {
            tickets_id: ticketGlpiId,
            cost_fixed: c.fixedCost,
            cost_time: c.timeCost,
            name: 'Coûts financiers importés',
          },
        });
        created.ticketCosts.push({ id: costRes.id });
      } catch (err) {
        log(`⚠️ Coût ignoré pour le ticket ID ${ticketGlpiId} : ${err.message}`);
      }
    }, (done, total) => {
      log(`  → Coûts : ${done}/${total}`);
      onProgress && onProgress();
    });

    // ── ÉTAPE 5 : Upload des images ──
    log('🖼️ Upload des images...');
    const imageEntries = Object.entries(images);

    await runInBatches(imageEntries, async ([equipName, { blob, filename }]) => {
      const glpiItem = equipNameToGlpi[equipName];
      if (!glpiItem) return; // image sans équipement correspondant, on ignore

      // Préparer FormData pour l'upload
      const formData = new FormData();
      formData.append('uploadManifest', JSON.stringify({
        input: {
          name: filename,
          _filename: [filename],
        },
      }));
      formData.append('filename[0]', blob, filename);

      console.log(`Uploading image for ${equipName}: filename=${filename}, size=${blob.size}, type=${blob.type}`);
      try {
        const docRes = await fetchDataAPIRest('Document', {
          method: 'POST',
          body: formData,
          isFormData: true,
        });
        if (docRes && docRes.id) {
          console.log(`Document created for ${equipName}: id=${docRes.id}, response=`, docRes);
          created.documents.push({ id: docRes.id });
          // Lier le document à l'équipement
          await fetchDataAPIRest('Document_Item', {
            method: 'POST',
            body: {
              input: {
                documents_id: docRes.id,
                items_id: glpiItem.id,
                itemtype: glpiItem.itemtype,
              },
            },
          });
        }
      } catch (imgErr) {
        // Une image qui échoue est une erreur bloquante
        throw new Error(`Upload image "${filename}" échoué : ${imgErr.message}`);
      }
    }, (done, total) => {
      log(`  → Images : ${done}/${total}`);
      onProgress && onProgress();
    });

    // ── ÉTAPE 5 : Finalisation des statuts de tickets résolus/clos ──
    if (ticketsToUpdateStatus.length > 0) {
      log('🔄 Finalisation des statuts de tickets (Résolus/Clos)...');
      await runInBatches(ticketsToUpdateStatus, async (item) => {
        try {
          await fetchDataAPIRest(`Ticket/${item.id}`, {
            method: 'PUT',
            body: {
              input: { 
                id: item.id, 
                status: item.status,
                date: item.date,
                date_creation: item.date
              }
            }
          });
        } catch (err) {
          log(`  ⚠️ Impossible de mettre à jour le statut du ticket ID ${item.id} à ${item.status} : ${err.message}`);
        }
      }, (done, total) => {
        log(`  → Finalisation tickets : ${done}/${total}`);
        onProgress && onProgress();
      });
    }

    log('✅ Import terminé avec succès !');
    return { success: true, created };

  } catch (error) {
    log(`❌ Erreur détectée : ${error.message}`);
    log('⏪ Déclenchement du rollback...');
    await phase4_rollback(created, log);
    throw error;
  }
}

export async function phase4_rollback(created, onLog) {
  const log = (msg) => onLog && onLog(msg);
  const deleteItem = async (endpoint, id) => {
    try {
      await fetchDataAPIRest(`${endpoint}/${id}?force_purge=true`, { method: 'DELETE' });
    } catch (e) {
      log(`  ⚠️ Impossible de supprimer ${endpoint}/${id} : ${e.message}`);
    }
  };

  log('🗑️ Suppression des documents créés...');
  if (created.documents) {
      for (const { id } of created.documents) await deleteItem('Document', id);
  }

  log('🗑️ Suppression des coûts créés...'); // 🟢 NOUVEAU: Purge des TicketCosts
  if (created.ticketCosts) {
      for (const { id } of created.ticketCosts) await deleteItem('TicketCost', id);
  }

  log('🗑️ Suppression des tâches créées...');
  if (created.ticketTasks) {
      for (const { id } of created.ticketTasks) await deleteItem('TicketTask', id);
  }

  log('🗑️ Suppression des tickets créés...');
  if (created.tickets) {
      for (const { id } of created.tickets) await deleteItem('Ticket', id);
  }

  log('🗑️ Suppression des équipements créés...');
  if (created.equipments && created.equipments.length > 0) {
    for (const { id, itemtype } of created.equipments) {
      await deleteItem(itemtype, id);
    }
  } else {
    // Fallback historique si l'ancien format est fourni
    if (created.monitors) {
        for (const { id } of created.monitors) await deleteItem('Monitor', id);
    }
    if (created.computers) {
        for (const { id } of created.computers) await deleteItem('Computer', id);
    }
  }

  log('✅ Rollback terminé. Base de données restaurée.');
}