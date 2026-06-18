# Guide d'implémentation — Ticket le plus coûteux (Most Expensive Ticket Card)

Ce guide montre comment identifier le ticket ayant engendré la dépense financière la plus importante et l'afficher de manière distinctive sur le Dashboard pour attirer l'attention des gestionnaires.

---

## 1. Fonction de Recherche du Ticket le plus Coûteux (JavaScript)

Cette fonction parcourt la liste des tickets préalablement enrichis avec leurs calculs financiers individuels, puis isole le ticket ayant le coût réel le plus élevé.

```javascript
/**
 * Recherche le ticket le plus coûteux dans un ensemble de tickets.
 * @param {Array} ticketsWithFinancials - Liste de tickets enrichis par calculateTicketFinancials
 */
export const getMostExpensiveTicket = (ticketsWithFinancials = []) => {
  if (ticketsWithFinancials.length === 0) return null;
  
  // Utilise reduce pour trouver le ticket ayant le totalCost maximum
  return ticketsWithFinancials.reduce((maxTicket, currentTicket) => {
    return (currentTicket.totalCost > (maxTicket?.totalCost || 0)) ? currentTicket : maxTicket;
  }, null);
};
```

---

## 2. Composant UI : Carte du Ticket le plus Coûteux (`MostExpensiveTicketCard.jsx`)

Voici le code pour afficher une carte d'information haut de gamme mettant en avant ce ticket critique :

```jsx
import { getMostExpensiveTicket } from '../../services/statsService';
import { formatCurrency, getStatusLabel } from '../../services/glpiUtils';
import { Badge, Button } from '../templates';

export default function MostExpensiveTicketCard({ ticketsWithFinancials = [], onViewDetails }) {
  const ticket = getMostExpensiveTicket(ticketsWithFinancials);

  if (!ticket) {
    return (
      <div className="border border-neutral-200 rounded-xl p-6 bg-white shadow-sm flex items-center justify-center h-48">
        <p className="text-neutral-400 italic text-sm">Aucun ticket disponible.</p>
      </div>
    );
  }

  const assignedTech = ticket.team?.find(m => m.role === 'assigned')?.name || 'Non assigné';

  return (
    <div className="border-2 border-neutral-900 rounded-2xl p-6 bg-white shadow-md relative overflow-hidden text-black font-sans flex flex-col justify-between h-full">
      {/* Badge indicateur de coût critique */}
      <div className="absolute top-0 right-0 bg-neutral-900 text-white text-[10px] font-extrabold px-3 py-1 rounded-bl-xl uppercase tracking-widest">
        Dépense Record
      </div>

      <div className="space-y-4">
        <div>
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block">Ticket #${ticket.id}</span>
          <h3 className="font-bold text-neutral-900 text-lg mt-0.5 line-clamp-1">{ticket.name || 'Sans titre'}</h3>
        </div>

        {/* Détails financiers */}
        <div className="bg-neutral-50 rounded-xl p-4 border border-neutral-100 grid grid-cols-3 gap-2">
          <div>
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">Coût Fixe</span>
            <span className="text-sm font-semibold text-neutral-800">{formatCurrency(ticket.fixedCost)}</span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">Coût Temps</span>
            <span className="text-sm font-semibold text-neutral-800">{formatCurrency(ticket.timeCost)}</span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 uppercase font-bold block">Total</span>
            <span className="text-sm font-bold text-neutral-900">{formatCurrency(ticket.totalCost)}</span>
          </div>
        </div>

        {/* Intervenants / Statut */}
        <div className="grid grid-cols-2 gap-2 text-xs border-t border-neutral-100 pt-3">
          <div>
            <span className="text-neutral-400 font-semibold block">Technicien</span>
            <span className="font-medium text-neutral-800">{assignedTech}</span>
          </div>
          <div>
            <span className="text-neutral-400 font-semibold block">Statut du ticket</span>
            <div className="mt-0.5">
              <Badge variant="dark">{getStatusLabel(ticket.status)}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Action pour ouvrir et traiter */}
      <div className="mt-6 pt-4 border-t border-neutral-100 flex justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => onViewDetails && onViewDetails(ticket)}
        >
          Consulter le ticket
        </Button>
      </div>
    </div>
  );
}
```

---

## 3. Intégration Recommandée
* **`Dashboard.jsx`** : Placez ce composant en haut de la page à côté des autres indicateurs clés de performance (KPIs) financiers pour identifier instantanément l'incident qui a consommé le plus de ressources techniques et matérielles.
