import { useState, useEffect } from 'react';
import { fetchGlpiData } from '../services/apiClient';

export function useTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadTickets = async () => {
    setLoading(true);
    try {
      let allTickets = [];
      let start = 0;
      const limit = 100;
      while (true) {
        const data = await fetchGlpiData(`/Assistance/Ticket?expand_dropdowns=true&range=${start}-${start + limit - 1}`);
        const list = Array.isArray(data) ? data : (data?.data || []);
        if (!Array.isArray(list) || list.length === 0) break;

        // Sécurité contre la boucle infinie si le range est ignoré par le serveur
        if (list.length > 0 && allTickets.some(t => t.id === list[0].id)) {
          break;
        }

        allTickets = allTickets.concat(list);
        if (list.length < limit) break;
        start += limit;
      }

      if (allTickets.length === 0) {
        const fallbackData = await fetchGlpiData('/Assistance/Ticket?expand_dropdowns=true');
        allTickets = Array.isArray(fallbackData) ? fallbackData : (fallbackData?.data || []);
      }

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