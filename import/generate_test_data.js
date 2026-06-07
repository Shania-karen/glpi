const fs = require('fs');
const path = require('path');

const targetDir = __dirname;

// 1. Generate Feuille 1 (Equipments)
// Headers: Name,Status,Location,Manufacturer,Item_Type,Model,Inventory_Number,User
let f1 = "Name,Status,Location,Manufacturer,Item_Type,Model,Inventory_Number,User\n";
const statuses = ["En production", "Maintenance", "En stock", "En panne"];
const locations = ["Administration", "Comptabilité", "Laboratoire IA", "Bibliothèque", "Magasin Informatique", "Salle 301"];
const manufacturers = ["Dell", "HP", "Lenovo", "Apple", "Asus"];
const models = ["OptiPlex 7010", "ProDesk 400 G9", "ThinkCentre M70", "MacBook Pro", "VivoBook"];

for (let i = 1; i <= 100; i++) {
  const isMonitor = (i % 5 === 0);
  const name = isMonitor ? `MN-DEV-${String(i).padStart(3, '0')}` : `PC-DEV-${String(i).padStart(3, '0')}`;
  const status = statuses[i % statuses.length];
  const loc = locations[i % locations.length];
  const manu = manufacturers[i % manufacturers.length];
  const type = isMonitor ? "Monitor" : "Computer";
  const model = models[i % models.length];
  const inv = `ITU-2026-${String(i).padStart(4, '0')}`;
  const user = i % 3 === 0 ? "" : `User ${i}`;
  f1 += `${name},${status},${loc},${manu},${type},${model},${inv},${user}\n`;
}
fs.writeFileSync(path.join(targetDir, 'Import-data-juin-26 - Feuille 1.csv'), f1);

// 2. Generate Feuille 2 (Tickets)
// Headers: Ref_Ticket,Date,Heure,Type,Titre,Description,Status,Priority,Items
let f2 = "Ref_Ticket,Date,Heure,Type,Titre,Description,Status,Priority,Items\n";
const ticketTypes = ["Incident", "Request"];
const ticketPriorities = ["Low", "Medium", "High"];
const ticketStatuses = ["New", "Processing", "Solved", "Closed"];

for (let i = 1; i <= 100; i++) {
  const ref = i;
  const day = String((i % 28) + 1).padStart(2, '0');
  const date = `${day}/06/2026`;
  const hour = `${String(10 + (i % 8)).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`;
  const type = ticketTypes[i % ticketTypes.length];
  const title = `Problème ${i}`;
  const desc = `Description détaillée du problème numéro ${i}`;
  const status = ticketStatuses[i % ticketStatuses.length];
  const priority = ticketPriorities[i % ticketPriorities.length];
  
  const isMonitor = (i % 5 === 0);
  const item1 = isMonitor ? `MN-DEV-${String(i).padStart(3, '0')}` : `PC-DEV-${String(i).padStart(3, '0')}`;
  const itemsStr = `["${item1}"]`;
  
  // Format items array properly for CSV quoting (double double-quotes)
  const escapedItems = `"${itemsStr.replace(/"/g, '""')}"`;
  
  f2 += `${ref},${date},${hour},${type},${title},${desc},${status},${priority},${escapedItems}\n`;
}
fs.writeFileSync(path.join(targetDir, 'Import-data-juin-26 - Feuille 2.csv'), f2);

// 3. Generate Feuille 3 (Costs)
// Headers: Num_Ticket,Duration_second,Time_Cost,Fixed_Cost
let f3 = "Num_Ticket,Duration_second,Time_Cost,Fixed_Cost\n";
for (let i = 1; i <= 100; i++) {
  const num = i;
  const duration = (i % 4) * 1800; // 0, 1800, 3600, 5400
  const timeCost = ((i * 1.5) % 20).toFixed(2);
  const fixedCost = ((i * 10) % 150).toFixed(2);
  f3 += `${num},${duration},"${timeCost.replace('.', ',')}","${fixedCost.replace('.', ',')}"\n`;
}
fs.writeFileSync(path.join(targetDir, 'Import-data-juin-26 - Feuille 3.csv'), f3);

console.log("Les 3 fichiers CSV ont été générés avec 100 entrées chacun pour les tests de performance !");
