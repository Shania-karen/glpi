# Fonctions de Logique Métier — Indicateurs Financiers et Décisionnels

Ce document présente des fonctions de logique métier pure destinées aux calculs financiers et opérationnels : évaluation du TCO (Total Cost of Ownership), calcul du ROI d'un équipement, rentabilité, perte opérationnelle et efficacité des techniciens.

---

## 1. Coût Total de Possession (TCO) d'un Équipement

Le **TCO (Total Cost of Ownership)** représente le coût global d'acquisition et de maintien d'un matériel tout au long de sa vie.

```javascript
/**
 * Calcule le TCO d'un équipement.
 * @param {number} purchasePrice - Prix d'achat d'origine du matériel
 * @param {Array<Object>} ticketCosts - Liste des coûts des tickets liés à cet équipement
 * @returns {Object} { purchasePrice, totalMaintenanceCost, tco }
 */
export function calculateAssetTCO(purchasePrice = 0, ticketCosts = []) {
  const totalMaintenanceCost = ticketCosts.reduce((acc, cost) => {
    const fixed = parseFloat(cost.fixedCost || 0);
    const time = parseFloat(cost.timeCost || 0);
    return acc + fixed + time;
  }, 0);

  return {
    purchasePrice,
    totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
    tco: Math.round((purchasePrice + totalMaintenanceCost) * 100) / 100
  };
}
```

---

## 2. ROI d'un Équipement et Alerte de Seuil de Remplacement (Pertes & Bénéfices)

Permet d'évaluer si un équipement coûte plus cher en maintenance que sa valeur résiduelle, devenant ainsi une **perte financière** pour l'organisation.

```javascript
/**
 * Évalue le statut de rentabilité d'un équipement.
 * Si les coûts de maintenance dépassent un certain pourcentage de sa valeur, 
 * il est recommandé de le remplacer (perte financière).
 * 
 * @param {number} assetValue - Prix d'achat de l'équipement
 * @param {Array<Object>} ticketCosts - Liste des coûts des tickets liés
 * @param {number} replacementThresholdPercent - Seuil d'alerte (par défaut 70%)
 * @returns {Object} Analyse de rentabilité { ratioMaintenanceValue, shouldReplace, status }
 */
export function evaluateAssetROI(assetValue = 0, ticketCosts = [], replacementThresholdPercent = 70) {
  if (assetValue <= 0) {
    return { ratioMaintenanceValue: 0, shouldReplace: true, status: 'Valeur initiale inconnue' };
  }

  const { totalMaintenanceCost } = calculateAssetTCO(0, ticketCosts);
  const ratio = (totalMaintenanceCost / assetValue) * 100;
  const shouldReplace = ratio >= replacementThresholdPercent;

  let status = 'Rentable';
  if (ratio >= 100) {
    status = 'Perte totale (Coût de maintenance > Valeur d\'achat)';
  } else if (shouldReplace) {
    status = 'Alerte : Maintenance excessive (À remplacer bientôt)';
  }

  return {
    ratioMaintenanceValue: Math.round(ratio * 100) / 100,
    shouldReplace,
    status
  };
}
```

---

## 3. Coût de Résolution Moyen par Priorité

Cette fonction permet d'obtenir des statistiques financières agrégées pour identifier les types d'incidents les plus onéreux pour l'entreprise.

```javascript
/**
 * Calcule le coût moyen de résolution des tickets par niveau de priorité.
 * @param {Array<Object>} tickets - Liste des tickets avec leurs coûts liés
 * @returns {Object} Clés = Priorités, Valeur = { count, totalCost, averageCost }
 */
export function calculateAverageCostByPriority(tickets = []) {
  const stats = {};

  tickets.forEach(ticket => {
    const priority = ticket.priority?.name || ticket.priority || 'Non spécifiée';
    const cost = parseFloat(ticket.totalCost || 0);

    if (!stats[priority]) {
      stats[priority] = { count: 0, totalCost: 0 };
    }

    stats[priority].count += 1;
    stats[priority].totalCost += cost;
  });

  // Calcul des moyennes
  Object.keys(stats).forEach(priority => {
    const s = stats[priority];
    s.averageCost = Math.round((s.totalCost / s.count) * 100) / 100;
    s.totalCost = Math.round(s.totalCost * 100) / 100;
  });

  return stats;
}
```

---

## 4. Analyse Financière du Technicien (Rentabilité vs Charge)

Calcule la valeur financière et horaire du temps investi par un technicien donné dans la résolution de tickets.

```javascript
/**
 * Synthétise les statistiques de coût et de charge d'un technicien.
 * @param {Array<Object>} ticketsAssigned - Liste des tickets assignés à ce technicien
 * @param {number} hourlyRate - Taux horaire du technicien
 * @returns {Object} Analyse de performance
 */
export function calculateTechnicianEfficiency(ticketsAssigned = [], hourlyRate = 0) {
  const totalTickets = ticketsAssigned.length;
  const resolvedTickets = ticketsAssigned.filter(t => t.status === 5 || t.status === 6).length;
  
  let totalDurationSeconds = 0;
  let totalFixedCosts = 0;

  ticketsAssigned.forEach(t => {
    totalDurationSeconds += parseFloat(t.durationSeconds || 0);
    totalFixedCosts += parseFloat(t.fixedCost || 0);
  });

  const totalTimeCost = (totalDurationSeconds / 3600) * hourlyRate;
  const grandTotalCost = totalTimeCost + totalFixedCosts;

  return {
    totalTickets,
    resolvedTickets,
    resolutionRate: totalTickets > 0 ? Math.round((resolvedTickets / totalTickets) * 100) : 0,
    totalDurationHours: Math.round((totalDurationSeconds / 3600) * 100) / 100,
    totalTimeCost: Math.round(totalTimeCost * 100) / 100,
    totalFixedCosts: Math.round(totalFixedCosts * 100) / 100,
    grandTotalCost: Math.round(grandTotalCost * 100) / 100,
    averageCostPerTicket: totalTickets > 0 ? Math.round((grandTotalCost / totalTickets) * 100) / 100 : 0
  };
}
```

---

## 5. Pertes Opérationnelles Mensuelles (Indisponibilité / Temps de Résolution)

Calcule la perte opérationnelle financière liée au cumul du temps de traitement des pannes.

```javascript
/**
 * Calcule la perte opérationnelle globale par mois.
 * @param {Array<Object>} tickets - Liste des tickets résolus ou en cours
 * @returns {Object} Clés = Mois ("YYYY-MM"), Valeur = totalLoss
 */
export function calculateMonthlyOperationalLoss(tickets = []) {
  const losses = {};

  tickets.forEach(ticket => {
    if (!ticket.date) return;
    
    // Extrait le mois (ex: "2026-06" depuis "2026-06-08")
    const month = ticket.date.substring(0, 7); 
    const ticketCost = parseFloat(ticket.totalCost || 0);

    if (!losses[month]) {
      losses[month] = 0;
    }

    losses[month] += ticketCost;
  });

  // Arrondis
  Object.keys(losses).forEach(month => {
    losses[month] = Math.round(losses[month] * 100) / 100;
  });

  return losses;
}
```
