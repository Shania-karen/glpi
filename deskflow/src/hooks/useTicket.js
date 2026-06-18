import { useState, useEffect } from 'react';
import { fetchDataAPIRest } from '../services/apiClient';

export function useTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const fetchAllRest = async (resource) => {
        const limit = 500;
        let start = 0;
        let all = [];
        const separator = resource.includes('?') ? '&' : '?';
        try {
          while (true) {
            const url = `${resource}${separator}range=${start}-${start + limit - 1}`;
            const data = await fetchDataAPIRest(url);
            if (!data || !Array.isArray(data) || data.length === 0) break;
            all = all.concat(data);
            if (data.length < limit) break;
            start += limit;
          }
          return all;
        } catch (err) {
          console.warn(`warning fetching REST ${resource}:`, err);
          return [];
        }
      };

      // 1. Fetch tickets, tasks, and costs in parallel
      const [allTickets, dataTasks, dataCosts, tuData] = await Promise.all([
        fetchAllRest('Ticket?expand_dropdowns=true'),
        fetchAllRest('TicketTask'),
        fetchAllRest('TicketCost'),
        fetchAllRest('Ticket_User?expand_dropdowns=true')
      ]);

      // 2. Fetch all Ticket_User relationships to resolve requester and assigned technician names
      const teamByTicketId = {};
      const tuList = Array.isArray(tuData) ? tuData : (tuData?.data || []);
      
      tuList.forEach(item => {
        const ticketLink = item.links?.find(l => l.rel === 'Ticket');
        if (!ticketLink) return;
        const ticketId = parseInt(ticketLink.href.split('/').pop(), 10);
        if (!ticketId) return;

        if (!teamByTicketId[ticketId]) {
          teamByTicketId[ticketId] = [];
        }

        const role = item.type === 1 ? 'requester' : (item.type === 2 ? 'assigned' : 'observer');
        teamByTicketId[ticketId].push({
          role,
          name: item.users_id // username since expand_dropdowns=true is used
        });
      });

      const rawTasks = Array.isArray(dataTasks) ? dataTasks : (dataTasks?.data || []);
      const rawCosts = Array.isArray(dataCosts) ? dataCosts : (dataCosts?.data || []);

      // 3. Reconstruct team, user_recipient, and unrolledLines properties for each ticket
      allTickets.forEach(ticket => {
        ticket.team = teamByTicketId[ticket.id] || [];
        ticket.user_recipient = {
          name: ticket.users_id_recipient // username since expand_dropdowns=true is used
        };

        const associatedCosts = rawCosts
          .filter(cost => String(cost.tickets_id?.id || cost.tickets_id) === String(ticket.id))
          .sort((a, b) => a.id - b.id);
        
        const associatedTasks = rawTasks
          .filter(task => String(task.tickets_id?.id || task.tickets_id) === String(ticket.id))
          .sort((a, b) => a.id - b.id);

        const availableTasks = [...associatedTasks];
        const unrolledLines = [];

        if (associatedCosts.length === 0 && availableTasks.length === 0) {
          unrolledLines.push({ ...ticket, actiontime: 0, cost_fixed: 0, cost_time: 0 });
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

            // CRITICAL: use the TicketCost's own actiontime (duration of the cost),
            // NOT the matched task's actiontime.
            // GLPI formula: time_cost = cost_time (hourly rate) × (cost.actiontime / 3600)
            const costActiontime = parseInt(String(cost.actiontime?.value || cost.actiontime || 0), 10) || 0;

            unrolledLines.push({
              ...ticket,
              actiontime: costActiontime,
              cost_fixed: costFixedVal,
              cost_time: costTimeVal
            });
          });

          availableTasks.forEach(task => {
            unrolledLines.push({
              ...ticket,
              actiontime: parseInt(task.actiontime?.value || task.actiontime || 0, 10),
              cost_fixed: 0,
              cost_time: 0
            });
          });
        }

        ticket.unrolledLines = unrolledLines;
      });

      const activeTickets = allTickets.filter(ticket => ticket.is_deleted !== true);
      setTickets(activeTickets);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTickets(); }, []);

  return { tickets, loading, error, loadTickets };
}