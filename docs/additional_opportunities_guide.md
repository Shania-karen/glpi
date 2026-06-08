# Guide d'opportunités — Nouvelles Fonctionnalités & Analyses Dashboard (GLPI)

Ce guide récapitule les idées de fonctionnalités à forte valeur ajoutée pour optimiser la gestion financière et l'efficacité opérationnelle de votre helpdesk GLPI.

---

## 1. Alerte Remplacement Équipement (Seuil de Rentabilité / TCO)

### Concept
Déclencher une alerte critique lorsqu'un équipement a nécessité des réparations (coûts cumulés de tous ses tickets) dont le coût total dépasse 50% de sa valeur d'achat d'origine.

### Formule
$$\text{Alerte Remplacement} = \frac{\text{Coûts Cumulés des Tickets du Matériel}}{\text{Valeur d'Achat du Matériel}} > 0.50$$

### Code JavaScript suggéré
```javascript
/**
 * Identifie les équipements dont le coût de support dépasse la moitié de leur valeur.
 * @param {Array} assetsWithTco - Tableau retourné par calculateTcoPerAsset
 * @param {Object} assetPurchaseValues - Dictionnaire des prix d'achat d'origine { assetId: prix }
 */
export const getAssetsToReplace = (assetsWithTco = [], assetPurchaseValues = {}) => {
  return assetsWithTco.map(asset => {
    const purchaseValue = assetPurchaseValues[asset.id] || 1000; // 1000€ par défaut si non renseigné
    const costRatio = asset.totalCost / purchaseValue;
    return {
      ...asset,
      purchaseValue,
      costRatio,
      needsReplacement: costRatio >= 0.5
    };
  }).filter(a => a.needsReplacement);
};
```

---

## 2. Suivi des Délais de Résolution & Respect SLA (Service Level Agreement)

### Concept
Vérifier si les tickets ont été résolus avant leur date limite (`time_to_resolve` de GLPI). Cela permet de suivre le pourcentage de respect des engagements de service.

### Code JavaScript suggéré
```javascript
/**
 * Calcule le taux de respect des engagements de résolution (SLA).
 */
export const getSlaComplianceRate = (tickets = []) => {
  const resolvedTickets = tickets.filter(t => t.status === 5 || t.status === 6); // Résolus ou Clos
  if (resolvedTickets.length === 0) return 100;

  let respectedCount = 0;

  resolvedTickets.forEach(t => {
    if (!t.time_to_resolve) {
      respectedCount++; // Si aucune date limite, considéré dans les temps
      return;
    }

    const resolutionDate = new Date(t.date_mod || t.date);
    const slaDeadline = new Date(t.time_to_resolve);

    if (resolutionDate <= slaDeadline) {
      respectedCount++;
    }
  });

  return (respectedCount / resolvedTickets.length) * 100;
};
```

---

## 3. Productivité & Rentabilité par Technicien

### Concept
Mesurer le coût horaire total économisé ou le coût moyen par ticket résolu par chaque technicien pour identifier l'efficacité opérationnelle.

### Code JavaScript suggéré
```javascript
/**
 * Analyse la rentabilité financière moyenne par technicien.
 */
export const getTechnicianPerformance = (ticketsWithFinancials = []) => {
  const techStats = {}; // { techId: { name, resolvedCount, totalCost, avgCostPerTicket } }

  ticketsWithFinancials.forEach(t => {
    // Si le ticket est résolu ou clos
    if (t.status === 5 || t.status === 6) {
      const assignedTech = t.team?.find(member => member.role === 'assigned') || t.users_id_tech;
      const techId = assignedTech?.id || assignedTech;
      const techName = assignedTech?.name || 'Technicien';

      if (techId) {
        if (!techStats[techId]) {
          techStats[techId] = { id: techId, name: techName, resolvedCount: 0, totalCost: 0 };
        }
        techStats[techId].resolvedCount += 1;
        techStats[techId].totalCost += t.totalCost || 0;
      }
    }
  });

  return Object.values(techStats).map(t => ({
    ...t,
    avgCostPerTicket: t.resolvedCount > 0 ? t.totalCost / t.resolvedCount : 0
  })).sort((a, b) => a.avgCostPerTicket - b.avgCostPerTicket); // Le coût moyen le plus bas (le plus efficace) en premier
};
```

---

## 4. Exporter un Rapport Financier CSV

### Concept
Permettre à l'administrateur d'exporter un fichier CSV contenant toutes les données financières calculées par ticket pour l'intégrer dans un logiciel de comptabilité (type Excel).

### Code JavaScript suggéré
```javascript
/**
 * Exporte les tickets avec leur détail financier au format CSV.
 */
export const exportFinancialReportsToCSV = (ticketsWithFinancials = []) => {
  const headers = ["ID Ticket", "Titre", "Statut", "Coût Fixe (€)", "Coût Temps (€)", "Coût Total (€)"];
  
  const rows = ticketsWithFinancials.map(t => [
    t.id,
    t.name,
    t.status?.name || t.status,
    t.fixedCost.toFixed(2),
    t.timeCost.toFixed(2),
    t.totalCost.toFixed(2)
  ]);

  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `rapport_financier_tickets_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
```
