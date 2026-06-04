import { useState } from 'react';
import { useTickets } from '../../hooks/useTicket';
import { useUsers } from '../../hooks/useUser';
import { exportTicketsToCSV } from '../../utils/csvHelper';
import{ parseCSVToTickets } from '../../utils/importHelper';  
import { processTicketImport } from '../../utils/importHelper';
import TicketModal from './TicketModal';
import ResetForm from './ResetForm';

export default function TicketList() {
  const { tickets, loading, error, loadTickets } = useTickets();
  const handleExportCSV = () => exportTicketsToCSV(tickets);
  const { users } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  const handleFileUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const textContent = await file.text();
  const ticketsToImport = parseCSVToTickets(textContent);

  if (ticketsToImport.length === 0) {
    alert("Aucun ticket valide trouvé dans le fichier.");
    event.target.value = null;
    return;
  }
  setIsImporting(true);
  setImportProgress({ current: 0, total: ticketsToImport.length });
  try {
      const successCount = await processTicketImport(file, (current, total) => {
        setImportProgress({ current, total });
      });

      alert(` Importation terminée avec succès !\n${successCount} tickets créés.`);
      
    } catch (error) {
      alert(` ${error.message}`);
      
    } finally {
      setIsImporting(false);
      loadTickets();
      event.target.value = null;
    }
};
  const openModalForCreate = () => {
    setCurrentTicket(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (ticket) => {
    setCurrentTicket(ticket);
    setIsModalOpen(true);
  };
  return (
    <div className="ticket-manager">
      <h1>Gestion des Tickets GLPI</h1>
      <button onClick={openModalForCreate} style={{ marginBottom: '15px' }}>
        Créer un nouveau ticket
      </button>
      <button onClick={handleExportCSV} style={{ marginBottom: '15px' }}>
        Exporter en CSV
      </button>
      <label>
          Importer depuis CSV 
          <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileUpload} />
        </label>
      <input 
        type="file" 
        accept=".csv" 
        onChange={handleFileUpload} 
        />

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
                  <td>{ticket.name || 'Sans titre'}</td>
                  <td>{ticket.status?.name || ticket.status || '-'}</td>
                  <td>{ticket.date}</td>
                  <td>{ticket.priority?.name || ticket.priority || '-'}</td>
                  <td>
                    {ticket.team?.find(t => t.role === 'requester')?.name || ticket.user_recipient?.name || '-'}
                  </td>
                  <td>
                    {ticket.team?.find(t => t.role === 'assigned')?.name || 'Non assigné'}
                  </td>
                  <td>{ticket.category?.name || 'Sans catégorie'}</td>
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
      {isImporting && (
        <div style={{ padding: '10px', backgroundColor: '#fff3cd', color: '#856404', marginBottom: '15px' }}>
           Importation en cours : {importProgress.current} / {importProgress.total} tickets traités...
        </div>
      )}

      {isModalOpen && (
        <TicketModal
          ticket={currentTicket}
          users={users}
          onClose={() => setIsModalOpen(false)}
          onSaved={loadTickets}
        />
      )}
      <ResetForm onResetComplete={loadTickets} />
    </div>
  );
}