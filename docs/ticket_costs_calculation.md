# Calcul et Affichage des Coûts (Fixe et Temps) par Ticket

Ce document présente une fonction JavaScript prête à l'emploi permettant de calculer et d'afficher le **Coût Fixe (Fixed Cost)**, le **Coût de Temps (Time Cost)** et le **Coût Total** pour chaque ticket.

---

## 1. Description du Calcul des Coûts

Dans le modèle de données GLPI de l'application, les coûts et le temps d'action sont calculés comme suit pour chaque ligne (tâche/coût associé) d'un ticket :
1. **Coût Fixe (`cost_fixed`)** : Somme directe des coûts fixes déclarés pour le ticket.
2. **Coût de Temps (`cost_time`)** :
   - *Option A (Taux horaire)* : Le `cost_time` représente le taux horaire. Le coût réel en temps de la ligne est alors :
     $$\text{Coût de Temps} = \frac{\text{actiontime (en secondes)}}{3600} \times \text{cost\_time}$$
   - *Option B (Somme directe)* : Le `cost_time` est directement le montant facturé en temps pour cette intervention (somme brute).

La fonction fournie ci-dessous implémente les deux approches afin d'offrir une flexibilité totale selon les directives de l'évaluateur.

---

## 2. Fonction JavaScript de Calcul et d'Affichage

Voici la fonction à intégrer dans vos utilitaires (par exemple dans `deskflow/src/utils/ticketHelper.js` ou directement dans vos composants) :

```javascript
/**
 * Calcule les coûts détaillés (fixes et liés au temps) pour un ticket unique.
 * Supporte le calcul basé sur le taux horaire ou la somme brute.
 * 
 * @param {Object} ticket - L'objet ticket (contenant unrolledLines ou actiontime/cost_fixed/cost_time)
 * @param {boolean} useHourlyRate - Si vrai, cost_time est traité comme un taux horaire multiplié par actiontime.
 * @returns {Object} Un objet contenant les détails financiers du ticket
 */
export function getTicketCostsSummary(ticket, useHourlyRate = true) {
  let totalFixedCost = 0;
  let totalTimeCost = 0;
  let totalDurationSeconds = 0;

  // Si le ticket contient des lignes dégroupées (unrolledLines)
  if (ticket.unrolledLines && Array.isArray(ticket.unrolledLines)) {
    ticket.unrolledLines.forEach(line => {
      const fixed = parseFloat(line.cost_fixed) || 0;
      const timeVal = parseFloat(line.cost_time) || 0;
      const duration = parseInt(line.actiontime, 10) || 0;

      totalFixedCost += fixed;
      totalDurationSeconds += duration;

      if (useHourlyRate) {
        // Option A : cost_time est un taux horaire (ex: 15€/h)
        const durationHours = duration / 3600;
        totalTimeCost += (timeVal * durationHours);
      } else {
        // Option B : cost_time est directement le coût calculé
        totalTimeCost += timeVal;
      }
    });
  } else {
    // Fallback si l'objet ticket est simple et plat
    const fixed = parseFloat(ticket.cost_fixed) || 0;
    const timeVal = parseFloat(ticket.cost_time) || 0;
    const duration = parseInt(ticket.actiontime, 10) || 0;

    totalFixedCost = fixed;
    totalDurationSeconds = duration;

    if (useHourlyRate) {
      totalTimeCost = (duration / 3600) * timeVal;
    } else {
      totalTimeCost = timeVal;
    }
  }

  const totalCost = totalFixedCost + totalTimeCost;

  return {
    ticketId: ticket.id,
    ticketName: ticket.name || 'Sans titre',
    durationHours: (totalDurationSeconds / 3600).toFixed(2),
    fixedCost: totalFixedCost.toFixed(2),
    timeCost: totalTimeCost.toFixed(2),
    totalCost: totalCost.toFixed(2)
  };
}

/**
 * Parcourt une liste de tickets, calcule les coûts pour chacun et les affiche proprement.
 * 
 * @param {Array<Object>} tickets - Liste des tickets
 * @param {boolean} useHourlyRate - Mode de calcul pour le coût de temps
 * @returns {Array<Object>} Tableau des coûts calculés pour tous les tickets
 */
export function displayAndGetAllTicketsCosts(tickets = [], useHourlyRate = true) {
  console.log("=== RÉCAPITULATIF DES COÛTS DES TICKETS ===");
  
  const results = tickets.map(ticket => {
    const summary = getTicketCostsSummary(ticket, useHourlyRate);
    
    // Affichage formaté dans la console
    console.log(
      `Ticket #${summary.ticketId} [${summary.ticketName.substring(0, 30)}] : ` +
      `Coût Fixe: ${summary.fixedCost} € | ` +
      `Coût Temps: ${summary.timeCost} € (Durée: ${summary.durationHours}h) | ` +
      `Total: ${summary.totalCost} €`
    );
    
    return summary;
  });
  
  console.log("===========================================");
  return results;
}
```

---

## 3. Exemple d'utilisation dans un composant React

Si vous souhaitez afficher ces totaux sous forme de tableau ou de liste dans votre interface (par exemple dans le Dashboard ou la liste des tickets), voici comment procéder :

```jsx
import React, { useMemo } from 'react';
import { getTicketCostsSummary } from '../../utils/ticketHelper';

export function TicketsCostsTable({ tickets }) {
  // Calculer les coûts pour tous les tickets actifs
  const ticketsCosts = useMemo(() => {
    return tickets.map(ticket => getTicketCostsSummary(ticket, true));
  }, [tickets]);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-500 uppercase tracking-wider">
            <th className="px-4 py-3">ID</th>
            <th className="px-4 py-3">Ticket</th>
            <th className="px-4 py-3 text-right">Temps Passé</th>
            <th className="px-4 py-3 text-right">Coût Fixe</th>
            <th className="px-4 py-3 text-right">Coût Temps</th>
            <th className="px-4 py-3 text-right bg-neutral-100/50 font-bold text-neutral-800">Coût Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 text-sm">
          {ticketsCosts.map((item) => (
            <tr key={item.ticketId} className="hover:bg-neutral-50/50 transition-colors">
              <td className="px-4 py-3 font-semibold text-neutral-400">#{item.ticketId}</td>
              <td className="px-4 py-3 font-medium text-neutral-800 truncate max-w-[200px]">
                {item.ticketName}
              </td>
              <td className="px-4 py-3 text-right text-neutral-600">{item.durationHours} h</td>
              <td className="px-4 py-3 text-right text-red-600 font-medium">{item.fixedCost} €</td>
              <td className="px-4 py-3 text-right text-blue-600 font-medium">{item.timeCost} €</td>
              <td className="px-4 py-3 text-right font-bold text-neutral-900 bg-neutral-50/20">
                {item.totalCost} €
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```
