import { useState, useEffect, useRef, useMemo } from 'react';
import { fetchDataAPIRest, fetchGlpiData } from '../../services/apiClient';
import { Button, Spinner, Badge } from '../templates';

const extractValue = (field) => {
    if (field === null || field === undefined || field === '' || field === 0 || field === '0') return null;
    if (Array.isArray(field)) {
        if (field.length === 0) return null;
        return field.map(f => f.completename || f.name || f.value || f.id).join(', ') || null;
    }
    if (typeof field === 'object') {
        return field.completename || field.name || field.value || field.id || null;
    }
    return String(field);
};

const getModelName = (detail) => {
    if (!detail) return '-';
    if (detail.model) {
        const val = extractValue(detail.model);
        if (val) return val;
    }
    if (detail.models_id) {
        const val = extractValue(detail.models_id);
        if (val) return val;
    }
    for (const key of Object.keys(detail)) {
        if (key.endsWith('models_id')) {
            const val = extractValue(detail[key]);
            if (val) return val;
        }
    }
    return '-';
};

const getTypeName = (detail) => {
    if (!detail) return '-';
    if (detail.type) {
        const val = extractValue(detail.type);
        if (val) return val;
    }
    for (const key of Object.keys(detail)) {
        if (key.endsWith('types_id')) {
            const val = extractValue(detail[key]);
            if (val) return val;
        }
    }
    return detail.itemtype || '-';
};

export default function TicketDetailView({ ticketId, onClose, onSaved }) {
  const [ticketData, setTicketData] = useState(null);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [linkedItems, setLinkedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('timeline');
  const [ticketCosts, setTicketCosts] = useState([]);
  const [ticketTasks, setTicketTasks] = useState([]);

  const [replyContent, setReplyContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const timelineEndRef = useRef(null);

  const loadTicketDetails = async () => {
    setLoading(true);
    try {
      const [ticket, followups, tasks, solutions, costs] = await Promise.all([
        fetchDataAPIRest(`Ticket/${ticketId}?expand_dropdowns=true`),
        fetchDataAPIRest(`Ticket/${ticketId}/ITILFollowup?expand_dropdowns=true`).catch(() => []),
        fetchDataAPIRest(`Ticket/${ticketId}/TicketTask?expand_dropdowns=true`).catch(() => []),
        fetchDataAPIRest(`Ticket/${ticketId}/ITILSolution?expand_dropdowns=true`).catch(() => []),
        fetchDataAPIRest(`Ticket/${ticketId}/TicketCost?expand_dropdowns=true`).catch(() => [])
      ]);
      setTicketData(ticket);
      
      const rawCosts = Array.isArray(costs) ? costs : (costs?.data || []);
      const rawTasks = Array.isArray(tasks) ? tasks : (tasks?.data || []);
      setTicketCosts(rawCosts);
      setTicketTasks(rawTasks);

      try {
        const items = await fetchDataAPIRest(`Ticket/${ticketId}/Item_Ticket`);
        console.log('DEBUG Item_Ticket response:', items);
        if (Array.isArray(items) && items.length > 0) {
          const itemDetails = await Promise.all(
            items.map(async (item) => {
              try {
                const detail = await fetchDataAPIRest(`${item.itemtype}/${item.items_id}?expand_dropdowns=true`);
                return { ...item, name: detail.name || `${item.itemtype} #${item.items_id}`, detail };
              } catch {
                return { ...item, name: `${item.itemtype} #${item.items_id}`, detail: null };
              }
            })
          );
          setLinkedItems(itemDetails);
        }
      } catch (err) {
        console.warn("Erreur chargement éléments liés:", err.message);
      }
      let events = [];
      if (ticket.content) {
        events.push({
          type: 'description',
          date: ticket.date_creation || ticket.date || new Date().toISOString(),
          content: ticket.content,
          author: 'Demandeur'
        });
      }
      console.log('DEBUG followups array:', followups);
      const followupsArray = Array.isArray(followups) ? followups : (followups.data || []);

      followupsArray.forEach(f => events.push({
        type: 'followup',
        date: f.date_creation || f.date || f.date_mod || new Date().toISOString(),
        content: f.content,
        author: f.users_id
      }));
      rawTasks.forEach(t => events.push({
        type: 'task',
        date: t.date_creation || t.date || t.date_mod || new Date().toISOString(),
        content: t.content,
        author: t.users_id_tech
      }));
      solutions.forEach(s => events.push({
        type: 'solution',
        date: s.date_creation || s.date || s.date_mod || new Date().toISOString(),
        content: s.content,
        status: s.status,
        solutionId: s.id,
        author: s.users_id
      }));

      events.sort((a, b) => new Date(a.date) - new Date(b.date));
      setTimelineEvents(events);

    } catch (error) {
      console.error("Erreur de chargement", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicketDetails();
  }, [ticketId]);

  useEffect(() => {
    if (timelineEndRef.current) {
      timelineEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [timelineEvents]);

  const unrolledLines = useMemo(() => {
    if (!ticketData) return [];
    const associatedCosts = [...ticketCosts].sort((a, b) => a.id - b.id);
    const associatedTasks = [...ticketTasks].sort((a, b) => a.id - b.id);
    
    const availableTasks = [...associatedTasks];
    const lines = [];

    if (associatedCosts.length === 0 && availableTasks.length === 0) {
      lines.push({ actiontime: 0, cost_fixed: 0, cost_time: 0 });
    } else {
      associatedCosts.forEach(cost => {
        const costTimeVal = parseFloat(String(cost.cost_time?.value || cost.cost_time || 0).replace(',', '.'));
        const costFixedVal = parseFloat(String(cost.cost_fixed?.value || cost.cost_fixed || 0).replace(',', '.'));
        
        let matchedTask = null;
        
        if (costTimeVal > 0) {
          const taskIdx = availableTasks.findIndex(t => parseInt(t.actiontime?.value || t.actiontime || 0, 10) > 0);
          if (taskIdx !== -1) matchedTask = availableTasks.splice(taskIdx, 1)[0];
        } else {
          const taskIdx = availableTasks.findIndex(t => parseInt(t.actiontime?.value || t.actiontime || 0, 10) === 0);
          if (taskIdx !== -1) matchedTask = availableTasks.splice(taskIdx, 1)[0];
        }

        if (!matchedTask && availableTasks.length > 0) {
          matchedTask = availableTasks.shift();
        }

        lines.push({
          actiontime: matchedTask ? parseInt(matchedTask.actiontime?.value || matchedTask.actiontime || 0, 10) : 0,
          cost_fixed: costFixedVal,
          cost_time: costTimeVal
        });
      });

      availableTasks.forEach(task => {
        lines.push({
          actiontime: parseInt(task.actiontime?.value || task.actiontime || 0, 10),
          cost_fixed: 0,
          cost_time: 0
        });
      });
    }
    return lines;
  }, [ticketData, ticketCosts, ticketTasks]);

  const { fixedCostTotal, timeCostTotal } = useMemo(() => {
    let fixedTotal = 0;
    let timeTotal  = 0;

    // Each TicketCost record has its own actiontime, cost_fixed, and cost_time (hourly rate).
    // GLPI formula: time_cost = cost_time (€/h) × (actiontime_seconds / 3600)
    ticketCosts.forEach(cost => {
      const fixedVal   = parseFloat(String(cost.cost_fixed?.value || cost.cost_fixed || 0).replace(',', '.')) || 0;
      const rateVal    = parseFloat(String(cost.cost_time?.value  || cost.cost_time  || 0).replace(',', '.')) || 0;
      const seconds    = parseInt(String(cost.actiontime?.value   || cost.actiontime || 0), 10) || 0;
      fixedTotal += fixedVal;
      timeTotal  += rateVal * (seconds / 3600);
    });

    return { fixedCostTotal: fixedTotal, timeCostTotal: timeTotal };
  }, [ticketCosts]);

  const handleSendFollowup = async () => {
    if (!replyContent.trim() || isSending) return;
    setIsSending(true);
    try {
      await fetchDataAPIRest(`ITILFollowup`, {
        method: 'POST',
        body: {
          input: {
            items_id: ticketId,
            itemtype: 'Ticket',
            content: replyContent
          }
        }
      });
      setReplyContent('');
      await loadTicketDetails();
      if (onSaved) onSaved();
    } catch (err) {
      alert("Erreur lors de l'envoi : " + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendFollowup();
    }
  };

  const handleApproveSolution = async (solutionId, isApproved) => {
    try {
      let refusalComment = '';
      if (!isApproved) {
        refusalComment = window.prompt("Motif ");
        if (refusalComment === null) return; 
      }
      if (refusalComment && refusalComment.trim() !== '') {
        await fetchDataAPIRest(`ITILFollowup`, {
          method: 'POST',
          body: {
            input: {
              items_id: ticketId,
              itemtype: 'Ticket',
              content: `Refus de la solution :\n${refusalComment}`
            }
          }
        });
      }
      if (solutionId) {
        const targetStatus = isApproved ? 2 : 3; 
        await fetchDataAPIRest(`ITILSolution/${solutionId}`, {
          method: 'PUT',
          body: {
            input: { id: solutionId, status: targetStatus }
          }
        });
      }
      const targetTicketStatus = isApproved ? 6 : 2;
      await fetchDataAPIRest(`Ticket/${ticketId}`, {
        method: 'PUT',
        body: {
          input: { id: ticketId, status: targetTicketStatus }
        }
      });
      await loadTicketDetails();
      if (onSaved) onSaved();
    } catch (err) {
      alert("Erreur lors de l'action : " + err.message);
    }
  };
  const safeString = (val) => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') return val.name || val.completename || val.id || JSON.stringify(val);
    return String(val);
  };
  const getEventTypeLabel = (type) => {
    const labels = {
      description: 'Description',
      followup: 'Suivi',
      task: 'Tâche',
      solution: 'Solution'
    };
    return labels[safeString(type)] || safeString(type);
  };
  const getStatusLabel = (status) => {
    if (status && typeof status === 'object') return status.name || status.id;
    const map = { 1: 'Nouveau', 2: 'En cours', 3: 'En cours (Planifié)', 4: 'En attente', 5: 'Résolu', 6: 'Clos' };
    return map[status] || safeString(status);
  };
  const getUrgencyLabel = (u) => {
    if (u && typeof u === 'object') return u.name || u.id;
    const map = { 1: 'Très basse', 2: 'Basse', 3: 'Moyenne', 4: 'Haute', 5: 'Très haute' };
    return map[u] || safeString(u);
  };
  if (loading) return <div className="p-10 flex justify-center"><Spinner /></div>;
  const statusStr = String(ticketData?.status?.name || ticketData?.status || '').toLowerCase();
  const isResolved = ticketData?.status === 5 || ticketData?.status === '5' || statusStr.includes('résolu') || statusStr.includes('resolu');
  const pendingSolution = timelineEvents.find(e => e.type === 'solution' && e.status === 1);
  return (
    <div className="flex h-screen bg-white text-black font-sans">
      <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col p-4">
        <Button variant="outline" className="mb-6 border-black text-black hover:bg-black hover:text-white" onClick={onClose}>
          ← Retour
        </Button>
        <nav className="space-y-1">
          <button
            className={`w-full text-left px-3 py-2 rounded transition-colors ${activeTab === 'timeline' ? 'bg-black text-white font-semibold' : 'hover:bg-gray-200'}`}
            onClick={() => setActiveTab('timeline')}
          >
            Fil du ticket
          </button>
          <button
            className={`w-full text-left px-3 py-2 rounded transition-colors ${activeTab === 'items' ? 'bg-black text-white font-semibold' : 'hover:bg-gray-200'}`}
            onClick={() => setActiveTab('items')}
          >
            Éléments liés
            {linkedItems.length > 0 && (
              <span className="ml-2 text-xs bg-gray-300 text-black px-1.5 py-0.5 rounded-full">{linkedItems.length}</span>
            )}
          </button>
          <button
            className={`w-full text-left px-3 py-2 rounded transition-colors ${activeTab === 'stats' ? 'bg-black text-white font-semibold' : 'hover:bg-gray-200'}`}
            onClick={() => setActiveTab('stats')}
          >
            Statistiques
          </button>
        </nav>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="px-6 pt-6 pb-3 border-b border-gray-200">
          <h2 className="text-2xl font-bold">
            {safeString(ticketData.name)} <span className="text-gray-400 text-lg">#{safeString(ticketData.id)}</span>
          </h2>
        </div>
        {isResolved && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-6 py-4 flex justify-between items-center">
            <div>
              <p className="font-bold text-emerald-800">Ce ticket est marqué comme Résolu.</p>
              <p className="text-sm text-emerald-700">Souhaitez-vous approuver la solution pour clore le ticket définitivement ?</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700"
                onClick={() => handleApproveSolution(pendingSolution ? pendingSolution.solutionId : null, true)}>
                Approuver
              </Button>
              <Button size="sm" variant="outline" className="border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => handleApproveSolution(pendingSolution ? pendingSolution.solutionId : null, false)}>
                Refuser
              </Button>
            </div>
          </div>
        )}
        {activeTab === 'timeline' && (
          <>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {timelineEvents.map((event, index) => (
                <div key={index} className={`flex ${event.type === 'followup' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] border p-4 rounded-lg shadow-sm
                    ${event.type === 'solution' ? 'bg-black text-white border-black' :
                      event.type === 'task' ? 'bg-yellow-50 border-yellow-200' :
                      event.type === 'description' ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200'}`}
                  >
                    <div className="text-xs font-semibold mb-2 flex justify-between items-center gap-3 opacity-70">
                      <span>{new Date(event.date).toLocaleString()}</span>
                      <Badge variant={event.type === 'solution' ? 'light' : event.type === 'task' ? 'warning' : 'dark'}>
                        {getEventTypeLabel(event.type)}
                      </Badge>
                    </div>
                    <div className="text-sm" dangerouslySetInnerHTML={{ __html: event.content }}></div>

                    {event.type === 'solution' && event.status === 1 && (
                      <div className="mt-4 flex gap-2">
                        <Button size="sm" className="bg-white text-black hover:bg-gray-200"
                          onClick={() => handleApproveSolution(event.solutionId, true)}>
                          Approuver
                        </Button>
                        <Button size="sm" variant="outline" className="border-white text-white"
                          onClick={() => handleApproveSolution(event.solutionId, false)}>
                          Refuser
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={timelineEndRef} />
            </div>
            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex gap-3 items-end">
                <textarea
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                  rows={2}
                  placeholder="Écrire un suivi... (Entrée pour envoyer, Shift+Entrée pour retour à la ligne)"
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                />
                <Button
                  onClick={handleSendFollowup}
                  disabled={!replyContent.trim() || isSending}
                  className="px-6 py-3 bg-black text-white hover:bg-gray-800 disabled:opacity-40"
                >
                  {isSending ? 'Envoi...' : 'Envoyer'}
                </Button>
              </div>
            </div>
          </>
        )}
        {activeTab === 'items' && (
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="font-bold text-lg mb-4">Éléments liés au ticket</h3>
            {linkedItems.length > 0 ? (
              <div className="space-y-3">
                {linkedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.itemtype} — ID: {item.items_id}</p>
                      {item.detail && (
                        <div className="mt-2 text-xs text-gray-400 flex gap-4">
                          <span><strong>Type:</strong> {getTypeName(item.detail)}</span>
                          <span><strong>Modèle:</strong> {getModelName(item.detail)}</span>
                        </div>
                      )}
                    </div>
                    <Badge variant="dark">{item.itemtype}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic">Aucun élément lié à ce ticket.</p>
            )}
          </div>
        )}
        {activeTab === 'stats' && (
          <div className="flex-1 overflow-y-auto p-6">
            <h3 className="font-bold text-lg mb-4">Statistiques du ticket</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Date de création</span>
                <p className="font-medium mt-1">{new Date(ticketData.date_creation).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Dernière modification</span>
                <p className="font-medium mt-1">{new Date(ticketData.date_mod).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Temps d'action</span>
                <p className="font-medium mt-1">{ticketData.actiontime ? `${Math.floor(ticketData.actiontime / 3600)}h ${Math.floor((ticketData.actiontime % 3600) / 60)}min` : 'Non défini'}</p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Nombre de suivis</span>
                <p className="font-medium mt-1">{timelineEvents.filter(e => e.type === 'followup').length}</p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Coût fixe total</span>
                <p className="font-semibold mt-1 text-lg text-neutral-900">{fixedCostTotal.toFixed(2)} €</p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Coût horaire total</span>
                <p className="font-semibold mt-1 text-lg text-neutral-900">{timeCostTotal.toFixed(2)} €</p>
              </div>
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg col-span-2 text-white">
                <span className="text-xs text-neutral-400 uppercase font-bold tracking-wider">Coût total du ticket</span>
                <p className="font-bold mt-1 text-2xl text-white">{(fixedCostTotal + timeCostTotal).toFixed(2)} €</p>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="w-80 border-l border-gray-200 bg-gray-50 p-6 overflow-y-auto">
        <h3 className="font-bold text-lg mb-4">Niveaux de services</h3>

        <div className="space-y-4">
          <div className="p-3 bg-white border border-gray-200 rounded">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">TTO (Prise en charge)</span>
            <p className="font-medium mt-1">
              {ticketData.time_to_own ? new Date(ticketData.time_to_own).toLocaleString() : 'Non défini'}
            </p>
          </div>

          <div className="p-3 bg-white border border-gray-200 rounded">
            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">TTR (Résolution)</span>
            <p className="font-medium mt-1">
              {ticketData.time_to_resolve ? new Date(ticketData.time_to_resolve).toLocaleString() : 'Non défini'}
            </p>
          </div>
          <hr className="my-4 border-gray-200" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Statut:</span>
              <span className="font-semibold">{safeString(getStatusLabel(ticketData.status))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Urgence:</span>
              <span className="font-semibold">{safeString(getUrgencyLabel(ticketData.urgency))}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type:</span>
              <span className="font-semibold">
                {ticketData.type === 1 || ticketData.type?.id === 1 || String(ticketData.type?.name || '').toLowerCase().includes('incident') ? 'Incident' : 'Demande'}
              </span>
            </div>
          </div>
          <hr className="my-4 border-gray-200" />
          <h4 className="font-bold text-sm mb-2">Coûts financiers</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Coût fixe:</span>
              <span className="font-medium">{fixedCostTotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Coût horaire:</span>
              <span className="font-medium">{timeCostTotal.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 font-bold">
              <span>Total:</span>
              <span>{(fixedCostTotal + timeCostTotal).toFixed(2)} €</span>
            </div>
          </div>
          {linkedItems.length > 0 && (
            <>
              <hr className="my-4 border-gray-200" />
              <h4 className="font-bold text-sm mb-2">Éléments liés</h4>
              <div className="space-y-1">
                {linkedItems.map((item, idx) => (
                  <div key={idx} className="text-sm flex items-center gap-2">
                    <span className="text-gray-400">•</span>
                    <span>{item.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}