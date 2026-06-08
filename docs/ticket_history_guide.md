# Guide d'implémentation — Historique des Statuts & Suivi des Tâches (Timeline)

Ce guide détaille comment récupérer, filtrer et afficher l'historique complet des changements de statuts (provenant des logs d'audit GLPI) combiné avec le journal des tâches (`TicketTask`) d'un ticket sous forme de timeline chronologique.

---

## 1. Récupération des Données depuis GLPI

### 1.1. Historique des modifications (Logs GLPI)
GLPI enregistre chaque modification de champ (statut, priorité, technicien, etc.) dans une table de log. On y accède via l'endpoint :
`GET /Ticket/{ticketId}/Log?expand_dropdowns=true`

### 1.2. Journal des tâches (`TicketTask`)
Chaque action technique saisie par un technicien se trouve dans :
`GET /Ticket/{ticketId}/TicketTask?expand_dropdowns=true`

---

## 2. Filtrage & Unification de la Timeline (Logique JS)

Le code suivant montre comment :
1. Récupérer conjointement les logs et les tâches.
2. Filtrer le log d'audit pour ne conserver que les changements de **statut** (en GLPI, le champ statut correspond historiquement à l'option de recherche `12` ou au champ `status`).
3. Fusionner les deux listes par ordre chronologique décroissant.

```javascript
import { fetchDataAPIRest } from '../services/apiClient';
import { getStatusLabel } from '../services/glpiUtils';

/**
 * Récupère et unifie l'historique des statuts et des tâches.
 */
export const fetchTicketTimelineHistory = async (ticketId) => {
  try {
    const [logs, tasks] = await Promise.all([
      fetchDataAPIRest(`Ticket/${ticketId}/Log`).catch(() => []),
      fetchDataAPIRest(`Ticket/${ticketId}/TicketTask?expand_dropdowns=true`).catch(() => [])
    ]);

    const rawLogs = Array.isArray(logs) ? logs : (logs?.data || []);
    const rawTasks = Array.isArray(tasks) ? tasks : (tasks?.data || []);

    const timelineEvents = [];

    // 1. Traitement des logs GLPI (filtrage par changement de Statut)
    rawLogs.forEach(log => {
      // Dans GLPI, le statut est identifié par id_search_option = 12 ou le nom de champ "status"
      const isStatusChange = log.id_search_option === 12 || String(log.itemtype).toLowerCase() === 'ticket' && String(log.field).toLowerCase() === 'status';
      
      if (isStatusChange) {
        timelineEvents.push({
          id: `log-${log.id}`,
          type: 'status_change',
          date: log.date_mod,
          user: log.user_name || 'Système',
          oldValue: getStatusLabel(log.old_value),
          newValue: getStatusLabel(log.new_value),
          rawOld: log.old_value,
          rawNew: log.new_value
        });
      }
    });

    // 2. Traitement des tâches (TicketTask)
    rawTasks.forEach(task => {
      timelineEvents.push({
        id: `task-${task.id}`,
        type: 'task_added',
        date: task.date_creation || task.date || task.date_mod,
        user: task.users_id_tech?.name || 'Technicien',
        content: task.content,
        actiontime: task.actiontime,
        state: task.state // 1: À faire, 2: En cours, 3: Fait
      });
    });

    // 3. Tri chronologique (du plus récent au plus ancien)
    return timelineEvents.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch (error) {
    console.error("Erreur historique du ticket:", error);
    return [];
  }
};
```

---

## 3. Composant UI : Timeline d'Historique Premium (`TicketTimelineHistory.jsx`)

Voici le code pour afficher cette timeline avec un rendu soigné en noir et blanc (compatible avec le design system Deskflow) :

```jsx
import { useState, useEffect } from 'react';
import { fetchTicketTimelineHistory } from '../../services/ticketHistoryService';
import { Badge, Spinner } from '../templates';

export default function TicketTimelineHistory({ ticketId }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setLoading(true);
      const data = await fetchTicketTimelineHistory(ticketId);
      setEvents(data);
      setLoading(false);
    }
    loadHistory();
  }, [ticketId]);

  if (loading) return <Spinner label="Chargement de l'historique..." />;
  if (events.length === 0) return <p className="text-gray-400 italic">Aucun historique d'action disponible.</p>;

  return (
    <div className="flow-root py-4 font-sans text-black">
      <ul className="-mb-8">
        {events.map((event, eventIdx) => (
          <li key={event.id}>
            <div className="relative pb-8">
              {/* Ligne verticale de connexion */}
              {eventIdx !== events.length - 1 ? (
                <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-neutral-200" aria-hidden="true" />
              ) : null}
              
              <div className="relative flex space-x-3 items-start">
                <div>
                  {/* Icône / Bulle de statut */}
                  {event.type === 'status_change' ? (
                    <span className="h-8 w-8 rounded-full bg-neutral-900 flex items-center justify-center ring-8 ring-white text-white">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                    </span>
                  ) : (
                    <span className="h-8 w-8 rounded-full bg-neutral-100 border border-neutral-300 flex items-center justify-center ring-8 ring-white text-neutral-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.524 3h-3.048a2.25 2.25 0 0 0-2.143 1.888L5.25 10.5h13.5l-3.084-6.612ZM5.25 10.5v9a2.25 2.25 0 0 0 2.25 2.25h9a2.25 2.25 0 0 0 2.25-2.25v-9H5.25Z" />
                      </svg>
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                  <div>
                    {event.type === 'status_change' ? (
                      <p className="text-sm text-neutral-800">
                        Statut modifié par <span className="font-semibold text-black">{event.user}</span> :{' '}
                        <span className="line-through text-neutral-400">{event.oldValue}</span>
                        <span className="mx-2 text-neutral-400">→</span>
                        <span className="font-bold text-neutral-900">{event.newValue}</span>
                      </p>
                    ) : (
                      <div>
                        <p className="text-sm text-neutral-800">
                          Tâche technique ajoutée par <span className="font-semibold text-black">{event.user}</span>
                        </p>
                        <div className="mt-1 text-xs text-neutral-600 bg-neutral-50 p-2 rounded-lg border border-neutral-100">
                          <p className="whitespace-pre-wrap">{event.content}</p>
                          {event.actiontime > 0 && (
                            <span className="inline-block mt-2 font-mono text-[10px] bg-neutral-200 text-neutral-800 px-1.5 py-0.5 rounded">
                              Temps d'action : {Math.floor(event.actiontime / 60)} min
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs whitespace-nowrap text-neutral-400 self-start">
                    <time dateTime={event.date}>{new Date(event.date).toLocaleString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}</time>
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 4. Intégration
Vous pouvez importer et afficher cette timeline dans un nouvel onglet nommé **"Historique"** au sein de :
- **[`TicketDetailView.jsx`](file:///d:/shania/itu/L3/glpi/deskflow/src/components/ticket/TicketDetailView.jsx)** (à côté de "Fil du ticket" et "Statistiques").
