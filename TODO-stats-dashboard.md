# TODO — Statistiques et Métriques Avancées pour le Dashboard (Préparation Évaluation)

Ce guide décrit comment ajouter les indicateurs clés de performance (KPIs) financiers et opérationnels qu'un évaluateur pourrait vous demander d'ajouter dans le **Dashboard** (`Dashboard.jsx`).

---

## 1. Métriques Financières (Coûts du Support)

Puisque nous importons des coûts financiers (`Fixed_Cost` et `Time_Cost` de la Feuille 3), ce sont les métriques les plus probables à présenter.

### Les indicateurs à calculer :
1. **Coût Total du Support** : Somme des coûts fixes + coûts liés au temps passé.
2. **Coût Moyen par Ticket** : Coût total divisé par le nombre total de tickets.
3. **Temps Total d'Intervention** : Somme des durées de toutes les tâches en heures.
4. **Coût par Catégorie d'Équipement** : Identifier quel type d'équipement (Ordinateur, Moniteur, etc.) coûte le plus cher en maintenance.

### Code de calcul (à intégrer dans `Dashboard.jsx` sous `useMemo`) :

```javascript
const financialStats = useMemo(() => {
  let totalFixed = 0;
  let totalTimeCost = 0; // Si le Time_Cost est le taux horaire
  let totalDurationSeconds = 0;
  let totalDirectCost = 0; // Somme directe de cost_fixed + cost_time

  tickets.forEach(ticket => {
    (ticket.unrolledLines || []).forEach(line => {
      const fixed = parseFloat(line.cost_fixed) || 0;
      const timeCostRate = parseFloat(line.cost_time) || 0;
      const duration = parseInt(line.actiontime, 10) || 0;

      totalFixed += fixed;
      totalDurationSeconds += duration;
      
      // Si cost_time est déjà le coût calculé :
      totalDirectCost += (fixed + timeCostRate);

      // Si cost_time est un taux horaire (ex: 8.7€/h) :
      const durationInHours = duration / 3600;
      totalTimeCost += (timeCostRate * durationInHours);
    });
  });

  const totalCalculatedCost = totalFixed + totalTimeCost;
  const avgCostPerTicket = tickets.length > 0 ? (totalDirectCost / tickets.length) : 0;

  return {
    totalFixed,
    totalDurationHours: (totalDurationSeconds / 3600).toFixed(1),
    totalDirectCost: totalDirectCost.toFixed(2),
    totalCalculatedCost: totalCalculatedCost.toFixed(2),
    avgCostPerTicket: avgCostPerTicket.toFixed(2)
  };
}, [tickets]);
```

---

## 2. Performances du Support (Qualité de Service)

Ces statistiques démontrent l'efficacité de l'équipe informatique.

### Les indicateurs à calculer :
1. **Taux de Résolution** : Pourcentage de tickets résolus ou fermés par rapport au total.
2. **Durée Moyenne de Résolution** : Temps moyen passé par ticket (basé sur l'actiontime des tâches).
3. **Répartition par Priorité** : Nombre de tickets urgents/majeurs vs normaux.

### Code de calcul :

```javascript
const performanceStats = useMemo(() => {
  const resolvedOrClosed = tickets.filter(t => {
    const status = String(t.status?.id || t.status).toLowerCase();
    return status === '5' || status === '6' || status.includes('resolu') || status.includes('ferm');
  }).length;

  const resolutionRate = tickets.length > 0 ? ((resolvedOrClosed / tickets.length) * 100) : 0;

  // Calcul répartition priorité
  const priorities = { haute: 0, moyenne: 0, basse: 0 };
  tickets.forEach(t => {
    const p = String(t.priority?.name || t.priority).toLowerCase();
    if (p.includes('haut') || p.includes('maj') || p === '4' || p === '5') priorities.haute++;
    else if (p.includes('moy') || p === '3') priorities.moyenne++;
    else priorities.basse++;
  });

  return {
    resolutionRate: resolutionRate.toFixed(1),
    priorities
  };
}, [tickets]);
```

---

## 3. Exemple d'Intégration Visuelle dans le Dashboard

Vous pouvez ajouter une nouvelle section sous la grille des statuts des tickets dans `Dashboard.jsx`.

### Structure JSX à ajouter :

```jsx
{/* Section Statistiques Financières et Performances */}
<section className="mb-12">
  <h2 className="text-xl font-semibold text-gray-800 mb-6">Indicateurs de Performance</h2>
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    
    {/* Carte Coût Total */}
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <div className="text-sm font-medium text-gray-400">Coût Total Maintenance</div>
      <div className="mt-2 text-3xl font-bold text-gray-900">{financialStats.totalDirectCost} €</div>
      <div className="text-xs text-gray-500 mt-1">Coûts fixes + temps d'intervention</div>
    </div>

    {/* Carte Coût Moyen */}
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <div className="text-sm font-medium text-gray-400">Coût Moyen / Ticket</div>
      <div className="mt-2 text-3xl font-bold text-gray-900">{financialStats.avgCostPerTicket} €</div>
      <div className="text-xs text-gray-500 mt-1">Sur l'ensemble des tickets actifs</div>
    </div>

    {/* Carte Temps d'intervention */}
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <div className="text-sm font-medium text-gray-400">Temps Total de Travail</div>
      <div className="mt-2 text-3xl font-bold text-gray-900">{financialStats.totalDurationHours} H</div>
      <div className="text-xs text-gray-500 mt-1">Cumulé sur toutes les tâches</div>
    </div>

    {/* Carte Taux de Résolution */}
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <div className="text-sm font-medium text-gray-400">Taux de Résolution</div>
      <div className="mt-2 text-3xl font-bold text-gray-900">{performanceStats.resolutionRate} %</div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3">
        <div 
          className="bg-green-500 h-1.5 rounded-full" 
          style={{ width: `${performanceStats.resolutionRate}%` }}
        ></div>
      </div>
    </div>

  </div>
</section>
```

## 3.5. Afficher le Coût Total d'un Ticket individuel (Fiche Ticket)

Dans la vue de détail d'un ticket (`TicketDetailView.jsx`), l'évaluateur pourrait demander d'afficher le **Coût Total de ce ticket précis** (coûts fixes + coûts liés au temps passé).

### Étape 1 : Récupérer les coûts du ticket depuis l'API GLPI

Dans `TicketDetailView.jsx` (méthode `loadTicketDetails`), il faut charger l'endpoint `TicketCost` lié au ticket :

```javascript
const [ticket, followups, tasks, solutions, costs] = await Promise.all([
  fetchDataAPIRest(`Ticket/${ticketId}?expand_dropdowns=true`),
  fetchDataAPIRest(`Ticket/${ticketId}/ITILFollowup?expand_dropdowns=true`).catch(() => []),
  fetchDataAPIRest(`Ticket/${ticketId}/TicketTask?expand_dropdowns=true`).catch(() => []),
  fetchDataAPIRest(`Ticket/${ticketId}/ITILSolution?expand_dropdowns=true`).catch(() => []),
  fetchDataAPIRest(`Ticket/${ticketId}/TicketCost?expand_dropdowns=true`).catch(() => []) // ← Charger les coûts
]);
```

Ajouter un state pour stocker ces coûts en haut de `TicketDetailView` :
```javascript
const [ticketCosts, setTicketCosts] = useState([]);
// Puis dans loadTicketDetails :
setTicketCosts(costs);
```

### Étape 2 : Calculer le Coût Total dans le composant

Utiliser un `useMemo` pour cumuler les coûts de ce ticket :

```javascript
const ticketFinancials = useMemo(() => {
  let fixedSum = 0;
  let timeSum = 0;

  (ticketCosts || []).forEach(c => {
    fixedSum += parseFloat(c.cost_fixed) || 0;
    timeSum += parseFloat(c.cost_time) || 0;
  });

  return {
    fixedSum: fixedSum.toFixed(2),
    timeSum: timeSum.toFixed(2),
    totalSum: (fixedSum + timeSum).toFixed(2)
  };
}, [ticketCosts]);
```

### Étape 3 : Afficher les coûts dans l'onglet "Statistiques"

Dans le JSX de l'onglet `stats` (`activeTab === 'stats'`), ajouter les lignes suivantes :

```jsx
<div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
  <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Coûts Fixes</span>
  <p className="font-medium mt-1 text-red-600">{ticketFinancials.fixedSum} €</p>
</div>
<div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
  <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Coûts de Temps</span>
  <p className="font-medium mt-1 text-blue-600">{ticketFinancials.timeSum} €</p>
</div>
<div className="p-4 bg-gray-50 border border-gray-200 rounded-lg col-span-2">
  <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Coût Total du Ticket</span>
  <p className="text-xl font-bold mt-1 text-green-600">{ticketFinancials.totalSum} €</p>
</div>
```

---

## 4. Ce qu'un évaluateur peut demander de justifier

1. **"D'où viennent ces coûts ?"**
   * *Réponse* : Ils proviennent de la Feuille 3 du CSV d'import (`Import-data-juin-26 - Feuille 3.csv`), mappés via l'API REST GLPI sur les objets `TicketCost` et `TicketTask`.
2. **"Pourquoi certains tickets ont un coût à 0 € ?"**
   * *Réponse* : Ce sont des tickets importés ou créés sans tâche associée ou avec des coûts non définis (champs vides dans le CSV).
3. **"Comment est calculé le taux de résolution ?"**
   * *Réponse* : C'est le ratio des tickets ayant le statut `Résolu` (5) ou `Clos` (6) sur le nombre total de tickets importés/créés.

