import { useState, useEffect } from 'react';
import { fetchGlpiData } from '../services/apiClient';

export function useTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await fetchGlpiData('/Assistance/Ticket?expand_dropdowns=true');
      const activeTickets = data.filter(ticket => ticket.is_deleted !== true);
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