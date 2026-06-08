import { useState, useEffect } from 'react';
import { fetchDataAPIRest } from '../services/apiClient';

export function useTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTickets = async () => {
    setLoading(true);
    try {
      let allTickets = [];
      let start = 0;
      const limit = 500;
      
      // 1. Fetch tickets using standard REST API (range pagination is fully respected)
      while (true) {
        const url = `Ticket?expand_dropdowns=true&range=${start}-${start + limit - 1}`;
        const data = await fetchDataAPIRest(url);
        if (!data || !Array.isArray(data) || data.length === 0) break;
        allTickets = allTickets.concat(data);
        if (data.length < limit) break;
        start += limit;
      }

      // 2. Fetch all Ticket_User relationships to resolve requester and assigned technician names
      const teamByTicketId = {};
      const tuData = await fetchDataAPIRest('Ticket_User?expand_dropdowns=true&range=0-999').catch(() => []);
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

      // 3. Reconstruct team and user_recipient properties for compatibility with the TicketList component
      allTickets.forEach(ticket => {
        ticket.team = teamByTicketId[ticket.id] || [];
        ticket.user_recipient = {
          name: ticket.users_id_recipient // username since expand_dropdowns=true is used
        };
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