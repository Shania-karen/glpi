import { useState, useEffect } from 'react';
import { fetchGlpiData } from '../services/apiClient'; 

export default function TicketManager() {
  const [tickets, setTickets] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null); 
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    content: '',
    priority: 3 
  });

 
  const loadTickets = async () => {
    setLoading(true);
    try {
      const data = await fetchGlpiData('Assistance/Ticket?expand_dropdowns=true');
      setTickets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false); 
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    if (currentTicket) {
      setFormData({
        name: currentTicket.name || '',
        content: currentTicket.content || '',
        priority: currentTicket.priority || 3
      });
    } else {
      setFormData({ name: '', content: '', priority: 3 });
    }
  }, [currentTicket]);

  const openModalForCreate = () => {
    setCurrentTicket(null); 
    setIsModalOpen(true);
  };

  const openModalForEdit = (ticket) => {
    setCurrentTicket(ticket); 
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); 
    
    try {
      if (currentTicket) {
  
        await fetchGlpiData(`Assistance/Ticket/${currentTicket.id}`, {
          method: 'PUT',
          body: { input: formData } 
        });
      } else {
        await fetchGlpiData('Assistance/Ticket', {
          method: 'POST',
          body: { input: formData }
        });
      }
      
      closeModal(); 
      await loadTickets(); 
      
    } catch (err) {
      alert("Erreur de sauvegarde : " + err.message);
    }
  };

  return (
    <div className="ticket-manager">
      <h1>Gestion des Tickets GLPI</h1>
      <button onClick={openModalForCreate} style={{ marginBottom: '15px' }}>
        Créer un nouveau ticket
      </button>

      {loading && <p>Chargement des tickets en cours...</p>}
      {error && <p style={{ color: 'red' }}>Erreur : {error}</p>}

      {!loading && !error && (
        <table border="1" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f2f2f2' }}>
              <th>ID</th>
              <th>Titre</th>
              <th>Statut</th>
              <th>Date d'ouverture</th>
              <th>Priorité</th>
              <th>Demandeur</th>
              <th>Technicien</th>
              <th>Catégorie</th>
              <th>Actions</th> 
            </tr>
          </thead>
          <tbody>
            {tickets.length > 0 ? (
              tickets.map((ticket) => (
                <tr key={ticket.id}>
                  <td>{ticket.id}</td>
                  <td>{ticket.name}</td> 
                  <td>{ticket.status?.name || ticket.status || '-'}</td>
                  <td>{ticket.date}</td>
                  <td>{ticket.priority?.name || ticket.priority || '-'}</td>
                  
                  <td>{ticket.user_recipient?.name || '-'}</td> 
                  <td>{ticket.users_id_assign?.name || 'Non assigné'}</td>    
                  <td>{ticket.itilcategories_id?.name || 'Sans catégorie'}</td>  
                  
                  <td>
                    <button onClick={() => openModalForEdit(ticket)} style={{ marginRight: '5px' }}>
                      Modifier
                    </button>
                    <button onClick={() => console.log('Supprimer cliqué sur ID', ticket.id)}>
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '10px' }}>
                  Aucun ticket trouvé.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {isModalOpen && (
        <div style={{ marginTop: '20px', padding: '15px', border: '2px solid #ccc', backgroundColor: '#f9f9f9' }}>
           <h3>{currentTicket ? `Modifier le ticket #${currentTicket.id}` : "Créer un nouveau ticket"}</h3>
           
           <form onSubmit={handleSubmit}>
             <div style={{ marginBottom: '10px' }}>
               <label>Titre : </label>
               <input 
                 type="text" 
                 name="name" 
                 value={formData.name} 
                 onChange={handleChange} 
                 required 
                 style={{ width: '100%' }}
               />
             </div>

             <div style={{ marginBottom: '10px' }}>
               <label>Description : </label>
               <textarea 
                 name="content" 
                 value={formData.content} 
                 onChange={handleChange} 
                 rows="4"
                 style={{ width: '100%' }}
               />
             </div>

             <div style={{ marginBottom: '10px' }}>
               <label>Priorité : </label>
               <select name="priority" value={formData.priority} onChange={handleChange}>
                 <option value="1">Très basse</option>
                 <option value="2">Basse</option>
                 <option value="3">Moyenne</option>
                 <option value="4">Haute</option>
                 <option value="5">Très haute</option>
                 <option value="6">Majeure</option>
               </select>
             </div>

             <button type="submit" style={{ marginRight: '10px', backgroundColor: '#4CAF50', color: 'white', padding: '5px 10px', border: 'none', cursor: 'pointer' }}>
               Sauvegarder
             </button>
             <button type="button" onClick={closeModal} style={{ padding: '5px 10px', cursor: 'pointer' }}>
               Annuler
             </button>
           </form>
        </div>
      )}
    </div>
  );
}