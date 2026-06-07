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
  'New':        1,
  'Processing': 2,
  'Pending':    3,
  'Solved':     5,
  'Closed':     6,
};

const TICKET_PRIORITY_MAP = {
  'Very Low':  1,
  'Low':       2,
  'Medium':    3,
  'High':      4,
  'Very High': 5,
  'Major':     6,
};

const TICKET_TYPE_MAP = {
  'Incident': 1,
  'Request':  2,
};

const ITEMTYPE_MAP = {
  'Computer': 'Computer',
  'Monitor':  'Monitor',
  'Printer':  'Printer',
  'Phone':    'Phone',
  'Software': 'Software',
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
      complete: (result) => resolve(result.data),
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
  const [rawEquip, rawTickets, rawCouts] = await Promise.all([
    parseCsv(csvEquipements),
    parseCsv(csvTickets),
    parseCsv(csvCouts),
  ]);

  // Lire le ZIP et indexer par nom d'équipement
  const zip = await JSZip.loadAsync(zipFile);
  const images = {}; // { "PC-ADM-001": File }
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
  }));

  return { equipements, tickets, couts, images };
}

// ─────────────────────────────────────────────
// PHASE 2 : DRY RUN (Validation, aucun POST)
// ─────────────────────────────────────────────

export async function phase2_dryRun(equipements, tickets, couts, onLog) {
  const errors = [];
  const log = (msg) => onLog && onLog(msg);

  log('🔍 Vérification des doublons locaux (Feuille 1)...');

  // Doublons sur Inventory_Number
  const inventoryNums = equipements.map((e) => e.inventoryNumber).filter(Boolean);
  const dupInventory = inventoryNums.filter((v, i) => inventoryNums.indexOf(v) !== i);
  if (dupInventory.length > 0) {
    errors.push(`Doublons de numéros d'inventaire dans la Feuille 1 : ${[...new Set(dupInventory)].join(', ')}`);
  }

  // Doublons sur Name
  const names = equipements.map((e) => e.name).filter(Boolean);
  const dupNames = names.filter((v, i) => names.indexOf(v) !== i);
  if (dupNames.length > 0) {
    errors.push(`Doublons de noms d'équipement dans la Feuille 1 : ${[...new Set(dupNames)].join(', ')}`);
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
    if (!e.inventoryNumber) errors.push(`Feuille 1, ligne ${e._rowNum} : Champ "Inventory_Number" manquant.`);
    if (!e.itemType) errors.push(`Feuille 1, ligne ${e._rowNum} : Champ "Item_Type" manquant.`);
    if (e.itemType && !ITEMTYPE_MAP[e.itemType]) {
      errors.push(`Feuille 1, ligne ${e._rowNum} : Item_Type "${e.itemType}" non supporté. Valeurs acceptées : ${Object.keys(ITEMTYPE_MAP).join(', ')}.`);
    }
    if (e.status && GLPI_STATUS_MAP[e.status] === undefined) {
      errors.push(`Feuille 1, ligne ${e._rowNum} : Status "${e.status}" invalide. Valeurs acceptées : ${Object.keys(GLPI_STATUS_MAP).join(', ')}.`);
    }
  }

  // Validation Feuille 2
  const equipNameSet = new Set(equipements.map((e) => e.name));
  for (const t of tickets) {
    if (!t.refTicket) errors.push(`Feuille 2, ligne ${t._rowNum} : Champ "Ref_Ticket" manquant.`);
    if (!t.titre) errors.push(`Feuille 2, ligne ${t._rowNum} : Champ "Titre" manquant.`);
    if (!t.dateTime) errors.push(`Feuille 2, ligne ${t._rowNum} : Date/Heure invalide ("${t.rawDate}" "${t.rawHeure}"). Format attendu : DD/MM/YYYY HH:mm.`);
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
        if (!equipNameSet.has(itemName)) {
          errors.push(`Feuille 2, ligne ${t._rowNum} : L'équipement "${itemName}" (Items) n'existe pas dans la Feuille 1.`);
        }
      }
    }
  }

  // Validation Feuille 3 (références croisées)
  const refTicketSet = new Set(refTickets);
  for (const c of couts) {
    if (!c.numTicket) errors.push(`Feuille 3, ligne ${c._rowNum} : Champ "Num_Ticket" manquant.`);
    if (c.numTicket && !refTicketSet.has(c.numTicket)) {
      errors.push(`Feuille 3, ligne ${c._rowNum} : Num_Ticket "${c.numTicket}" ne correspond à aucun Ref_Ticket de la Feuille 2.`);
    }
    if (c.durationSeconds < 0) errors.push(`Feuille 3, ligne ${c._rowNum} : Duration_second négatif.`);
    if (c.timeCost < 0) errors.push(`Feuille 3, ligne ${c._rowNum} : Time_Cost négatif.`);
    if (c.fixedCost < 0) errors.push(`Feuille 3, ligne ${c._rowNum} : Fixed_Cost négatif.`);
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
    tickets: [],     // { id }
    ticketTasks: [], // { id }
    ticketCosts: [], // 🟢 NOUVEAU: Ajout du tracking des TicketCosts
    documents: [],   // { id }
  };

  const log = (msg) => onLog && onLog(msg);

  // Helper POST sécurisé : lance une erreur si statut != 2xx
  async function safePost(endpoint, body) {
    const result = await fetchDataAPIRest(endpoint, { method: 'POST', body });
    if (!result || result.id === undefined) {
      throw new Error(`POST ${endpoint} : réponse inattendue → ${JSON.stringify(result)}`);
    }
    return result;
  }

  try {
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
      const endpoint = itemType; // ex: "Computer", "Monitor"
      const createdKey = itemType === 'Computer' ? 'computers' : 'monitors';

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

        if (itemType === 'Computer') {
          payload.input.computermodels_id = e.model ? (computerModelDict[e.model.toLowerCase()] ?? 0) : 0;
          payload.input.computertypes_id = computerTypeDict['computer'] ?? 0;
        } else if (itemType === 'Monitor') {
          payload.input.monitormodels_id = e.model ? (monitorModelDict[e.model.toLowerCase()] ?? 0) : 0;
          payload.input.monitortypes_id = monitorTypeDict['monitor'] ?? 0;
        }

        const res = await safePost(endpoint, payload);
        created[createdKey].push({ id: res.id });
        equipNameToGlpi[e.name] = { id: res.id, itemtype: itemType };
      }, (done, total) => {
        log(`  → ${itemType} : ${done}/${total}`);
        onProgress && onProgress();
      });
    }

    // ── ÉTAPE 2 : Tickets ──
    log('🎫 Import des tickets...');
    const refToGlpiTicketId = {}; // "1" -> 42 (ID GLPI)

    await runInBatches(tickets, async (t) => {
      const payload = {
        input: {
          name: t.titre,
          content: t.description,
          date: t.dateTime,
          type: TICKET_TYPE_MAP[t.type] ?? 1,
          status: TICKET_STATUS_MAP[t.status] ?? 1,
          priority: TICKET_PRIORITY_MAP[t.priority] ?? 3,
          urgency: TICKET_PRIORITY_MAP[t.priority] ?? 3,
          impact: TICKET_PRIORITY_MAP[t.priority] ?? 3,
        },
      };
      const res = await safePost('Ticket', payload);
      created.tickets.push({ id: res.id });
      refToGlpiTicketId[t.refTicket] = res.id;
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
      await fetchDataAPIRest('Item_Ticket', {
        method: 'POST',
        body: {
          input: {
            tickets_id: rel.ticketId,
            items_id: rel.itemId,
            itemtype: rel.itemtype,
          },
        },
      });
    }, (done, total) => {
      log(`  → Relations : ${done}/${total}`);
      onProgress && onProgress();
    });

    // ── ÉTAPE 4 : Tâches/Coûts (Feuille 3) ──
    log('💰 Import des tâches et coûts...');
    await runInBatches(couts, async (c) => {
      const ticketGlpiId = refToGlpiTicketId[c.numTicket];
      if (!ticketGlpiId) return;

      // 1. 🟢 CORRECTION : Création SYMÉTRIQUE de la tâche (même à 0s) pour conserver l'alignement des index
      const taskRes = await safePost('TicketTask', {
        input: {
          tickets_id: ticketGlpiId,
          actiontime: c.durationSeconds, // Insère 0 ou 600 sans distinction
          content: `Tâche importée - Temps passé: ${c.durationSeconds}s`,
        },
      });
      created.ticketTasks.push({ id: taskRes.id });

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

    log('✅ Import terminé avec succès !');
    return { success: true, created };

  } catch (error) {
    log(`❌ Erreur détectée : ${error.message}`);
    log('⏪ Déclenchement du rollback...');
    await phase4_rollback(created, log);
    throw error;
  }
}

// ─────────────────────────────────────────────
// PHASE 4 : ROLLBACK AGRESSIF
// ─────────────────────────────────────────────

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

  log('🗑️ Suppression des moniteurs créés...');
  if (created.monitors) {
      for (const { id } of created.monitors) await deleteItem('Monitor', id);
  }

  log('🗑️ Suppression des ordinateurs créés...');
  if (created.computers) {
      for (const { id } of created.computers) await deleteItem('Computer', id);
  }

  log('✅ Rollback terminé. Base de données restaurée.');
}