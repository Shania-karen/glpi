import { useState } from 'react';
import { useTickets } from '../../hooks/useTicket';
import { useUsers } from '../../hooks/useUser';
import { exportTicketsToCSV } from '../../utils/csvHelper';
import { parseCSVToTickets, processTicketImport } from '../../utils/importHelper';
import TicketModal from './TicketModal';
import TicketDetailModal from './TicketDetailModal';
import ResetForm from './ResetForm';
import { useAssets } from '../../hooks/useAssets';
import { TicketIcon , ExportIcon,ImportIcon } from '../templates';
import {
  H1, P, Button, Table, Th, Tr, Td, Badge, Alert, Spinner, Divider, Card,
} from '../templates';

export default function TicketList() {
  const { tickets, loading, error, loadTickets } = useTickets();
  const handleExportCSV = () => exportTicketsToCSV(tickets);
  const { users } = useUsers();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);
  const { assets } = useAssets();

  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const textContent = await file.text();
    const ticketsToImport = parseCSVToTickets(textContent);

    if (ticketsToImport.length === 0) {
      alert("Aucun ticket valide trouve dans le fichier.");
      event.target.value = null;
      return;
    }
    setIsImporting(true);
    setImportProgress({ current: 0, total: ticketsToImport.length });
    try {
      const successCount = await processTicketImport(file, (current, total) => {
        setImportProgress({ current, total });
      });
      alert(`Importation terminee avec succes !\n${successCount} tickets crees.`);
    } catch (error) {
      alert(error.message);
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

  const openModalForDetails = (ticket) => {
    setCurrentTicket(ticket);
    setIsDetailModalOpen(true);
  };

  const getStatusVariant = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('resolu') || s.includes('résolu')) return 'success';
    if (s.includes('cours') || s.includes('attente')) return 'warning';
    if (s.includes('clos')) return 'dark';
    return 'default';
  };

  const getPriorityVariant = (priority) => {
    const p = String(priority || '').toLowerCase();
    if (p.includes('haute') || p.includes('majeure')) return 'danger';
    if (p.includes('moyenne')) return 'warning';
    return 'default';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <H1>Gestion des Tickets GLPI</H1>

        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="success" onClick={openModalForCreate}><TicketIcon /> Nouveau ticket</Button>
          <Button variant="outline" onClick={handleExportCSV}><ExportIcon /> Exporter CSV</Button>
          <label>
            <Button variant="secondary" as="span" className="cursor-pointer">
              <ImportIcon /> Importer CSV
            </Button>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>
        </div>
      </div>

      {/* Import progress */}
      {isImporting && (
        <Alert>
          Importation en cours : {importProgress.current} / {importProgress.total} tickets traites...
        </Alert>
      )}

      {/* Loading */}
      {loading && <Spinner size="lg" label="Chargement des tickets en cours..." />}

      {/* Error */}
      {error && <Alert>Erreur : {error}</Alert>}

      {/* Table */}
      {!loading && !error && (
        <Table>
          <thead>
            <Tr>
              <Th>ID</Th>
              <Th>Titre</Th>
              <Th>Statut</Th>
              <Th>Date</Th>
              <Th>Priorite</Th>
              <Th>Demandeur</Th>
              <Th>Technicien</Th>
              <Th>Categorie</Th>
              <Th>Actions</Th>
            </Tr>
          </thead>
          <tbody>
            {tickets.length > 0 ? (
              tickets.map((ticket) => (
                <Tr key={ticket.id}>
                  <Td>{ticket.id}</Td>
                  <Td className="font-medium text-black">{ticket.name || 'Sans titre'}</Td>
                  <Td>
                    <Badge variant={getStatusVariant(ticket.status?.name || ticket.status)}>{ticket.status?.name || ticket.status || '-'}</Badge>
                  </Td>
                  <Td>{ticket.date}</Td>
                  <Td>
                    <Badge variant={getPriorityVariant(ticket.priority?.name || ticket.priority)}>{ticket.priority?.name || ticket.priority || '-'}</Badge>
                  </Td>
                  <Td>
                    {ticket.team?.find(t => t.role === 'requester')?.name || ticket.user_recipient?.name || '-'}
                  </Td>
                  <Td>
                    {ticket.team?.find(t => t.role === 'assigned')?.name || 'Non assigne'}
                  </Td>
                  <Td>{ticket.category?.name || 'Sans categorie'}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <Button size="sm" variant="success" onClick={() => openModalForDetails(ticket)}>
                        Traiter
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openModalForEdit(ticket)}>
                        Modifier
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => console.log('Supprimer', ticket.id)}>
                        Supprimer
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))
            ) : (
              <Tr>
                <Td colSpan="9" className="text-center py-8 text-neutral-400">
                  Aucun ticket trouve.
                </Td>
              </Tr>
            )}
          </tbody>
        </Table>
      )}

      {/* Modals */}
      {isModalOpen && (
        <TicketModal
          ticket={currentTicket}
          users={users}
          assets={assets}
          onClose={() => setIsModalOpen(false)}
          onSaved={loadTickets}
        />
      )}

      {isDetailModalOpen && (
        <TicketDetailModal
          ticket={currentTicket}
          users={users}
          onClose={() => setIsDetailModalOpen(false)}
          onSaved={loadTickets}
        />
      )}

      <Divider />

    </div>
  );
}