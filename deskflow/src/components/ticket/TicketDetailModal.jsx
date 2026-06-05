import { useState, useEffect } from 'react';
import { fetchGlpiData,fetchDataAPIRest } from '../../services/apiClient';
import { Modal, Button, H3, P, Badge, Textarea, Select, FormGroup, Spinner, Divider } from '../templates';

export default function TicketDetailModal({ ticket, users, onClose, onSaved }) {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [replyContent, setReplyContent] = useState('');
  const [newStatus, setNewStatus] = useState(ticket?.status || '1');
  const [newAssignee, setNewAssignee] = useState(
    ticket?.team?.find(t => t.role === 'assigned')?.users_id || ''
  );

  useEffect(() => {
    const loadFollowups = async () => {
      try {
        const data = await fetchGlpiData(`/Assistance/Ticket/${ticket.id}/Timeline/Followup`);
        setFollowups(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erreur lors de la récupération des suivis :", err);
      } finally {
        setLoading(false);
      }
    };
    if (ticket) {
      loadFollowups();
    }
  }, [ticket]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
   
      if (replyContent.trim() !== '') {
        await fetchGlpiData(`/Assistance/Ticket/${ticket.id}/Timeline/Followup`, {
          method: 'POST',
          body: {
            content: replyContent
          }
        });
      }

      const ticketUpdatePayload = { id: ticket.id };
      let hasChanges = false;

      if (newStatus !== ticket.status && newStatus !== ticket.status?.name) {
        ticketUpdatePayload.status = newStatus;
        hasChanges = true;
      }

      const currentAssignee = ticket.team?.find(t => t.role === 'assigned')?.users_id;
      if (newAssignee && String(newAssignee) !== String(currentAssignee)) {
        ticketUpdatePayload._users_id_assign = parseInt(newAssignee);
        hasChanges = true;
      }

      if (hasChanges) {
        await fetchGlpiData(`/Assistance/Ticket/${ticket.id}`, {
          method: 'PATCH',
          body: ticketUpdatePayload
        });
      }

      onSaved();
      onClose(); 
    } catch (err) {
      alert("Erreur lors de la réponse : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusVariant = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('resolu') || s.includes('résolu')) return 'success';
    if (s.includes('cours') || s.includes('attente')) return 'warning';
    if (s.includes('clos')) return 'dark';
    return 'default';
  };

  if (!ticket) return null;

  return (
    <Modal
      title={`Fiche Ticket #${ticket.id} - ${ticket.name || 'Sans titre'}`}
      open={true}
      onClose={onClose}
      className="max-w-4xl"
    >
      <form onSubmit={handleSubmit}>
        <Modal.Body className="max-h-[70vh] overflow-y-auto space-y-6">
          
          <div className="bg-neutral-50 p-4 rounded-md border border-neutral-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <H3 className="mb-2">Description Initiale</H3>
                <P className="text-sm text-neutral-500">Date : {ticket.date}</P>
              </div>
              <Badge variant={getStatusVariant(ticket.status?.name || ticket.status)}>
                {ticket.status?.name || ticket.status || 'Nouveau'}
              </Badge>
            </div>
            <div className="text-sm text-black whitespace-pre-wrap">
              {ticket.content || "Aucune description fournie."}
            </div>
          </div>
          <Divider />
          <div>
            <H3 className="mb-4">Historique des Suivis</H3>
            {loading ? (
              <Spinner label="Chargement des suivis..." />
            ) : followups.length > 0 ? (
              <div className="space-y-4">
                {followups.map((f, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-md border border-neutral-200 shadow-sm">
                    <div className="flex justify-between items-center mb-2 border-b pb-2">
                      <span className="font-semibold text-sm">
                        {f.users_id?.name || f.users_id || 'Utilisateur inconnu'}
                      </span>
                      <span className="text-xs text-neutral-500">{f.date}</span>
                    </div>
                    <div className="text-sm whitespace-pre-wrap text-neutral-800">
                      {f.content}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <P className="text-sm text-neutral-500 italic">Aucun suivi sur ce ticket pour le moment.</P>
            )}
          </div>

          <Divider />
          <div className="bg-neutral-100 p-4 rounded-md border border-neutral-200">
            <H3 className="mb-4">Ajouter un suivi / Traiter</H3>
            
            <div className="space-y-4">
              <FormGroup label="Votre message (Suivi)">
                <Textarea 
                  rows={4} 
                  placeholder="Tapez votre réponse ici..." 
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                />
              </FormGroup>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormGroup label="Modifier le Statut">
                  <Select 
                    value={newStatus} 
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="1">Nouveau</option>
                    <option value="2">En cours (Attribué)</option>
                    <option value="3">En cours (Planifié)</option>
                    <option value="4">En attente</option>
                    <option value="5">Résolu</option>
                    <option value="6">Clos</option>
                  </Select>
                </FormGroup>

                <FormGroup label="Assigner un technicien">
                  <Select 
                    value={newAssignee} 
                    onChange={(e) => setNewAssignee(e.target.value)}
                  >
                    <option value="">-- Non assigné --</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.username || `${u.firstname} ${u.realname}`}
                      </option>
                    ))}
                  </Select>
                </FormGroup>
              </div>
            </div>
          </div>

        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Fermer
          </Button>
          <Button type="submit" variant="success" disabled={isSubmitting}>
            {isSubmitting ? 'Envoi en cours...' : 'Répondre et Sauvegarder'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
