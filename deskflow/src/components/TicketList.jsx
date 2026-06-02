import React, { useState, useEffect } from 'react';

import { fetchGlpiData } from '../services/apiClient';

const TicketList =()=>{
const [tickets, setTickets]= useState([]);
const [loading, setLoading]= useState(true);
const [ error, setError] = useState(null);

useEffect(()=>{
    const loadTicket =async()=>{
        try {
            const data = await fetchGlpiData('Ticket');
            setTickets(data);
        } catch (error) {
            setError(error.message);
        }finally {
            setLoading(false); 
        }
    }; 
    loadTicket();
}, []);

if(loading) return <div>Chargement des tickets..</div>
if(error) return <div>Erreur : {error}</div>

return(
    <div className="ticket-constainer">
        <h2> Liste des Tickets</h2>
        {tickets.length===0 ? (
            <p>Aucun ticket trouvé</p>
        ): (
            <ul>
                {tickets.map(ticket =>
                    <li key={ticket.id}>
                    <strong>Ticket #{ticket.id}</strong>- {ticket.name}    
                    </li>
                )}
            </ul>
        )}

    </div>
);

};
export default TicketList;