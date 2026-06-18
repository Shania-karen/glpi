# Guide de Calcul des Mesures Financières (Coûts, Bénéfices, Pertes)

Ce guide décrit les formules mathématiques et fonctions JavaScript pour calculer et analyser la rentabilité des interventions de support, identifier les pertes, et suivre le coût total de possession (TCO) des équipements.

---

## 1. Concepts Clés & Formules

| Métrique | Formule Mathématique | Description |
| :--- | :--- | :--- |
| **Coût Total ($C_{total}$)** | $C_{total} = \text{Coût Fixe} + (\text{Heures} \times \text{Taux Horaire})$ | Dépenses totales consommées pour clore le ticket. |
| **Bénéfice ($B$)** | $B = \text{Facturation (Budget)} - C_{total}$ | Marge nette réalisée sur la résolution du ticket. |
| **Perte ($P$)** | Si $C_{total} > \text{Facturation} \rightarrow P = C_{total} - \text{Facturation}$ | Dépassement budgétaire (coût d'intervention supérieur au budget alloué). |
| **Taux de Marge ($M$)** | $M = \left( \frac{B}{\text{Facturation}} \right) \times 100$ | Rentabilité en pourcentage (%). |

---

## 2. Fonctions JavaScript Utilitaires

### 2.1. Calcul unifié d'un Ticket (Coût, Bénéfice, Perte)
Cette fonction prend un ticket, ses coûts et son budget, puis calcule tous les indicateurs clés.

```javascript
/**
 * Calcule la rentabilité financière complète pour un ticket.
 * @param {Object} ticket - L'objet ticket (doit inclure actiontime)
 * @param {Array} costs - Tableau des TicketCost du ticket
 * @param {number} budget - Le budget ou montant facturé alloué au ticket (par défaut 0)
 */
export const calculateTicketFinancials = (ticket, costs = [], budget = 0) => {
  let fixedCost = 0;
  let hourlyRateSum = 0;

  // 1. Somme des coûts fixes et taux horaires
  costs.forEach(c => {
    const fVal = parseFloat(String(c.cost_fixed?.value || c.cost_fixed || 0).replace(',', '.'));
    const tVal = parseFloat(String(c.cost_time?.value || c.cost_time || 0).replace(',', '.'));
    
    fixedCost += isNaN(fVal) ? 0 : fVal;
    hourlyRateSum += isNaN(tVal) ? 0 : tVal;
  });

  // 2. Calcul du coût horaire réel basé sur la durée totale du ticket (actiontime)
  const durationSeconds = parseInt(ticket?.actiontime?.value || ticket?.actiontime || 0, 10);
  const durationHours = durationSeconds / 3600;
  const timeCost = durationHours * hourlyRateSum;

  const totalCost = fixedCost + timeCost;

  // 3. Calcul du bénéfice ou de la perte
  const profit = budget - totalCost;
  const isLoss = profit < 0;
  const marginPercentage = budget > 0 ? (profit / budget) * 100 : 0;

  return {
    fixedCost,
    timeCost,
    totalCost,
    budget,
    profit: !isLoss ? profit : 0,
    loss: isLoss ? Math.abs(profit) : 0,
    marginPercentage,
    isLoss
  };
};
```

---

### 2.2. Agrégation Globale du Dashboard (Stats cumulées)
Calcule les KPI globaux pour un tableau de bord à partir d'un ensemble de tickets.

```javascript
/**
 * Génère les statistiques globales financières pour un ensemble de tickets.
 * @param {Array} ticketsWithFinancials - Liste des tickets avec leurs financiers déjà calculés
 */
export const calculateGlobalMetrics = (ticketsWithFinancials = []) => {
  let totalRevenue = 0;
  let totalCosts = 0;
  let totalProfit = 0;
  let totalLoss = 0;
  let ticketLossCount = 0;

  ticketsWithFinancials.forEach(t => {
    totalRevenue += t.budget || 0;
    totalCosts += t.totalCost || 0;
    if (t.isLoss) {
      totalLoss += t.loss;
      ticketLossCount++;
    } else {
      totalProfit += t.profit;
    }
  });

  const netProfit = totalRevenue - totalCosts;
  const averageMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalCosts,
    totalProfit,
    totalLoss,
    netProfit,
    averageMargin,
    ticketLossCount,
    totalTickets: ticketsWithFinancials.length
  };
};
```

---

### 2.3. Coût de Maintenance par Équipement (TCO)
Permet d'identifier quels équipements coûtent le plus cher en support (pour conseiller un remplacement).

```javascript
/**
 * Regroupe et somme les coûts de maintenance par équipement unique.
 * @param {Array} ticketsWithFinancials - Tickets possédant les coûts et les équipements liés
 */
export const calculateTcoPerAsset = (ticketsWithFinancials = []) => {
  const assetTco = {}; // { assetId: { name, totalCost, ticketCount } }

  ticketsWithFinancials.forEach(t => {
    const linkedAssets = t.linkedItems || [];
    linkedAssets.forEach(asset => {
      const assetKey = `${asset.itemtype}_${asset.items_id}`;
      if (!assetTco[assetKey]) {
        assetTco[assetKey] = {
          id: asset.items_id,
          type: asset.itemtype,
          name: asset.name,
          totalCost: 0,
          ticketCount: 0
        };
      }
      // Répartir le coût du ticket équitablement s'il y a plusieurs équipements, ou l'attribuer en entier
      const costShare = t.totalCost / (linkedAssets.length || 1);
      assetTco[assetKey].totalCost += costShare;
      assetTco[assetKey].ticketCount += 1;
    });
  });

  // Retourne un tableau trié du plus coûteux au moins coûteux
  return Object.values(assetTco).sort((a, b) => b.totalCost - a.totalCost);
};
```

---

## 3. Exemple d'affichage UI (Composant de synthèse)

Voici comment structurer un composant de synthèse de rentabilité sur la page de détail ou sur le dashboard :

```jsx
import { calculateTicketFinancials, formatCurrency } from './glpiUtils';

export function TicketProfitabilityCard({ ticket, costs, budget }) {
  const fin = calculateTicketFinancials(ticket, costs, budget);

  return (
    <div className="border border-neutral-200 rounded-xl p-4 bg-white shadow-sm space-y-4">
      <h3 className="font-bold text-neutral-900">Rentabilité de l'intervention</h3>
      
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-neutral-400 text-xs block">Budget Facturé</span>
          <span className="font-semibold text-neutral-800">{formatCurrency(fin.budget)}</span>
        </div>
        <div>
          <span className="text-neutral-400 text-xs block">Coût Total Réel</span>
          <span className="font-semibold text-neutral-800">{formatCurrency(fin.totalCost)}</span>
        </div>
      </div>

      <div className="border-t border-neutral-100 pt-3 flex items-center justify-between">
        {fin.isLoss ? (
          <div>
            <span className="text-red-500 font-bold text-xs uppercase tracking-wider block">Déficit / Perte</span>
            <span className="text-red-600 font-extrabold text-lg">-{formatCurrency(fin.loss)}</span>
          </div>
        ) : (
          <div>
            <span className="text-emerald-500 font-bold text-xs uppercase tracking-wider block">Marge / Bénéfice</span>
            <span className="text-emerald-600 font-extrabold text-lg">+{formatCurrency(fin.profit)} ({fin.marginPercentage.toFixed(1)}%)</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 4. Pages Cibles pour ces Intégrations
- **`Dashboard.jsx`** : Pour afficher les KPI globaux (Revenu net global, Total des Pertes, et Top 5 des équipements les plus coûteux en maintenance).
- **`Detail.jsx` / `TicketDetailView.jsx`** : Pour insérer la fiche de rentabilité par ticket individuel.
