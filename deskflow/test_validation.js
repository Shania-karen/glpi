import fs from 'fs';
import Papa from 'papaparse';

// Mock TICKET maps and other maps
const TICKET_STATUS_MAP = {
  'New':         1,
  'Nouveau':     1,
  'In Progress': 2,
  'Processing':  2,
  'En cours':    2,
  'Assigned':    2,
  'Assigné':     2,
  'Assigne':     2,
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
  'Computer': 'Computer',
  'Monitor':  'Monitor',
  'Phone':    'Phone',
  'Ordinateur': 'Computer',
  'Moniteur': 'Monitor',
  'Téléphone': 'Phone',
  'Telephone': 'Phone',
};

function getMapValue(map, key, defaultVal) {
  if (!key) return defaultVal;
  const cleanKey = String(key).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  for (const [k, v] of Object.entries(map)) {
    const cleanK = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (cleanK === cleanKey) return v;
  }
  return defaultVal;
}

function parseItemsColumn(raw) {
  if (!raw || raw.trim() === '') return [];
  const trimmed = raw.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim());
    } catch {}
    try {
      const cleaned = trimmed.replace(/[']/g, '"');
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) return parsed.map((s) => String(s).trim());
    } catch {}
  }
  // Fallback to comma-separated list
  return trimmed.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

function parseCsvContent(content) {
  const firstLine = content.split(/\r?\n/)[0] || '';
  let delimiter = '';
  if (firstLine.includes(';')) {
    delimiter = ';';
  } else if (firstLine.includes(',')) {
    delimiter = ',';
  }
  const result = Papa.parse(content, {
    header: true,
    skipEmptyLines: true,
    delimiter: delimiter || undefined,
  });
  return { data: result.data, fields: result.meta.fields || [] };
}

function phase2_dryRun(equipements, tickets, couts) {
  const errors = [];

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

  // Doublons sur Inventory_Number
  const inventoryNums = equipements.map((e) => e.inventoryNumber).filter(Boolean);
  const dupInventory = inventoryNums.filter((v, i) => inventoryNums.indexOf(v) !== i);
  if (dupInventory.length > 0) {
    errors.push(`Doublons de numéros d'inventaire dans la Feuille 1 : ${[...new Set(dupInventory)].join(', ')}`);
  }

  // Validation Feuille 1
  for (const e of equipements) {
    if (!e.name) errors.push(`Feuille 1, ligne ${e._rowNum} : Champ "Name" manquant.`);
    if (!e.itemType) errors.push(`Feuille 1, ligne ${e._rowNum} : Champ "Item_Type" manquant.`);
    if (e.itemType && getMapValue(ITEMTYPE_MAP, e.itemType) === undefined) {
      errors.push(`Feuille 1, ligne ${e._rowNum} : Item_Type "${e.itemType}" non supporté. Valeurs acceptées : ${Object.keys(ITEMTYPE_MAP).join(', ')}.`);
    }
  }

  const isValidDateFormat = (dateStr) => {
    if (!dateStr) return false;
    const cleanStr = String(dateStr).trim();
    const parts = cleanStr.split(/[\/-]/);
    if (parts.length !== 3) return false;
    let day, month, year;
    if (parts[0].length === 4) {
      [year, month, day] = parts.map(p => parseInt(p, 10));
    } else {
      [day, month, year] = parts.map(p => parseInt(p, 10));
    }
    if (isNaN(day) || isNaN(month) || isNaN(year)) return false;
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    if (year < 1900 || year > 2100) return false;
    return true;
  };

  const isValidTimeFormat = (timeStr) => {
    if (!timeStr) return true;
    const parts = timeStr.trim().split(':');
    if (parts.length !== 2) return false;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return false;
    if (h < 0 || h > 23) return false;
    if (m < 0 || m > 59) return false;
    return true;
  };

  // Validation Feuille 2
  const equipNameSet = new Set(equipements.map((e) => e.name.toLowerCase().trim()));
  for (const t of tickets) {
    const refNum = parseInt(t.refTicket, 10);
    if (!t.refTicket || isNaN(refNum) || refNum <= 0) {
      errors.push(`Feuille 2, ligne ${t._rowNum} : Le champ Ref_Ticket doit être un nombre entier supérieur à 0 ("${t.refTicket || ''}").`);
    }

    if (!t.titre) errors.push(`Feuille 2, ligne ${t._rowNum} : Champ "Titre" manquant.`);
    
    if (!isValidDateFormat(t.rawDate)) {
      errors.push(`Feuille 2, ligne ${t._rowNum} : Format de Date invalide ("${t.rawDate || ''}"). Format attendu : DD/MM/YYYY ou YYYY-MM-DD.`);
    }
    if (t.rawHeure && !isValidTimeFormat(t.rawHeure)) {
      errors.push(`Feuille 2, ligne ${t._rowNum} : Format d'Heure invalide ("${t.rawHeure || ''}"). Format attendu : HH:mm.`);
    }

    if (t.type && getMapValue(TICKET_TYPE_MAP, t.type) === undefined) {
      errors.push(`Feuille 2, ligne ${t._rowNum} : Type "${t.type}" invalide. Valeurs : Incident, Request.`);
    }
    if (t.status && getMapValue(TICKET_STATUS_MAP, t.status) === undefined) {
      errors.push(`Feuille 2, ligne ${t._rowNum} : Status ticket "${t.status}" invalide.`);
    }
    if (t.priority && getMapValue(TICKET_PRIORITY_MAP, t.priority) === undefined) {
      errors.push(`Feuille 2, ligne ${t._rowNum} : Priority "${t.priority}" invalide.`);
    }
    if (t.items === null) {
      errors.push(`Feuille 2, ligne ${t._rowNum} : Colonne "Items" impossible à parser. Vérifiez le format JSON.`);
    } else if (Array.isArray(t.items)) {
      for (const itemName of t.items) {
        if (equipements.length > 0 && !equipNameSet.has(itemName.toLowerCase().trim())) {
          errors.push(`Feuille 2, ligne ${t._rowNum} : L'équipement "${itemName}" (Items) n'existe pas dans la Feuille 1.`);
        }
      }
    }
  }

  // Validation Feuille 3
  const refTickets = tickets.map((t) => t.refTicket).filter(Boolean);
  const refTicketSet = new Set(refTickets);
  for (const c of couts) {
    const numTicketVal = parseInt(c.numTicket, 10);
    if (!c.numTicket || isNaN(numTicketVal) || numTicketVal <= 0) {
      errors.push(`Feuille 3, ligne ${c._rowNum} : Le champ Num_Ticket doit être un nombre entier supérieur à 0 ("${c.numTicket || ''}").`);
    } else if (tickets.length > 0 && !refTicketSet.has(c.numTicket)) {
      errors.push(`Feuille 3, ligne ${c._rowNum} : Num_Ticket "${c.numTicket}" ne correspond à aucun Ref_Ticket de la Feuille 2.`);
    }
  }

  return errors;
}

const f1 = fs.readFileSync('../importMrRojo/Import-data-juin-26 - Feuille 1.csv', 'utf-8');
const f2 = fs.readFileSync('../importMrRojo/Import-data-juin-26 - Feuille 2.csv', 'utf-8');
const f3 = fs.readFileSync('../importMrRojo/Import-data-juin-26 - Feuille 3.csv', 'utf-8');

const resEquip = parseCsvContent(f1);
const resTickets = parseCsvContent(f2);
const resCouts = parseCsvContent(f3);

const equipements = resEquip.data.map((row, idx) => ({
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
equipements.headers = resEquip.fields;

const tickets = resTickets.data.map((row, idx) => ({
  _rowNum: idx + 2,
  refTicket: row['Ref_Ticket']?.trim() || '',
  rawDate: row['Date']?.trim() || '',
  rawHeure: row['Heure']?.trim() || '',
  type: row['Type']?.trim() || '',
  titre: row['Titre']?.trim() || '',
  description: row['Description']?.trim() || '',
  status: row['Status']?.trim() || '',
  priority: row['Priority']?.trim() || '',
  items: parseItemsColumn(row['Items']),
}));
tickets.headers = resTickets.fields;

const couts = resCouts.data.map((row, idx) => ({
  _rowNum: idx + 2,
  numTicket: row['Num_Ticket']?.trim() || '',
}));
couts.headers = resCouts.fields;

const errs = phase2_dryRun(equipements, tickets, couts);
console.log('--- VALIDATION ERRORS ---');
errs.forEach(e => console.log(e));
console.log('-------------------------');
