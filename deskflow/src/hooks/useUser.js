import { useState, useEffect } from 'react';
import { fetchGlpiData } from '../services/apiClient';

export function useUsers() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchGlpiData('Administration/User?expand_dropdowns=true')
      .then(setUsers)
      .catch(err => console.error("Erreur users :", err));
  }, []);

  return { users };
}