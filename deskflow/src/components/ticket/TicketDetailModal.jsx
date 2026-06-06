import { useState, useEffect } from 'react';
import { fetchGlpiData,fetchDataAPIRest } from '../../services/apiClient';
import { Modal, Button, H3, P, Badge, Textarea, Select, FormGroup, Spinner, Divider } from '../templates';

export default function TicketDetailModal({ ticket, users, onClose, onSaved }) {
  const [followups, setFollowups] = useState([]);
  const [solutionId, setSolutionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [replyContent, setReplyContent] = useState('');
  const [newStatus, setNewStatus] = useState(ticket?.status || '1');
  const [newAssignee, setNewAssignee] = useState(
    ticket?.team?.find(t => t.role === 'assigned')?.users_id || ''
  );

  useEffect(() => {
    const loadTicketData = async () => {
      try {
        const data = await fetchGlpiData(`/Assistance/Ticket/${ticket.id}/Timeline/Followup`);
        setFollowups(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Erreur lors de la récupération des suivis :", err);
      }

      // Récupérer la solution du ticket (si elle existe)
      try {
        const solutions = await fetchGlpiData(`/Assistance/Ticket/${ticket.id}/Timeline/Solution`);
        console.log('DEBUG Timeline/Solution response:', solutions);
        if (Array.isArray(solutions) && solutions.length > 0) {
          setSolutionId(solutions[solutions.length - 1].id);
        }
      } catch (err) {
        console.warn("Timeline/Solution échoué, tentative via ITILSolution...", err.message);
        // Essayer via l'ancienne API REST
        try {
          const solutions = await fetchDataAPIRest(`Ticket/${ticket.id}/ITILSolution`);
          console.log('DEBUG ITILSolution response:', solutions);
          if (Array.isArray(solutions) && solutions.length > 0) {
            setSolutionId(solutions[solutions.length - 1].id);
          }
        } catch (err2) {
          console.warn("ITILSolution échoué aussi:", err2.message);
        }
      }

      setLoading(false);
    };
    if (ticket) {
      loadTicketData();
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

      if (newStatus !== ticket.status && newStatus !== ticket.status?.name) {
        await fetchGlpiData(`/Assistance/Ticket/${ticket.id}`, {
          method: 'PATCH',
          body: { id: ticket.id, status: newStatus }
        });
      }

      const currentAssignee = ticket.team?.find(t => t.role === 'assigned')?.users_id;
      if (newAssignee && String(newAssignee) !== String(currentAssignee)) {
        // Si un technicien est déjà assigné, supprimer l'ancienne liaison
        if (currentAssignee) {
          try {
            const existingLinks = await fetchDataAPIRest(
              `Ticket/${ticket.id}/Ticket_User`
            );
            const oldLink = Array.isArray(existingLinks) 
              ? existingLinks.find(l => l.users_id == currentAssignee && l.type == 2)
              : null;
            if (oldLink) {
              await fetchDataAPIRest(`Ticket_User/${oldLink.id}`, {
                method: 'DELETE'
              });
            }
          } catch (e) {
            console.warn("Impossible de supprimer l'ancien assigné :", e.message);
          }
        }
        // Ajouter le nouveau technicien
        await fetchDataAPIRest('Ticket_User', {
          method: 'POST',
          body: {
            input: {
              tickets_id: ticket.id,
              users_id: parseInt(newAssignee),
              type: 2 
            }
          }
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

  const handleApproveSolution = async (isApproved) => {
    try {
      if (solutionId) {
        // Solution formelle : approuver/refuser via ITILSolution
        const targetStatus = isApproved ? 2 : 3;
        await fetchDataAPIRest(`ITILSolution/${solutionId}`, {
          method: 'PUT',
          body: {
            input: {
              id: solutionId,
              status: targetStatus
            }
          }
        });
      } else {
        // Pas de solution formelle : changer le statut du ticket directement
        const newTicketStatus = isApproved ? 6 : 2; // 6=Clos, 2=En cours
        await fetchGlpiData(`/Assistance/Ticket/${ticket.id}`, {
          method: 'PATCH',
          body: { id: ticket.id, status: newTicketStatus }
        });
      }
      alert(isApproved ? 'Solution approuvée (Ticket Clos)' : 'Solution refusée (Retour En Cours)');
      onSaved();
      onClose();
    } catch (err) {
      alert("Erreur lors de l'approbation : " + err.message);
    }
  };

  const getStatusVariant = (status) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('resolu') || s.includes('résolu')) return 'success';
    if (s.includes('cours') || s.includes('attente')) return 'warning';
    if (s.includes('clos')) return 'dark';
    return 'default';
  };

  const isResolved = 
    ticket?.status === 5 || 
    ticket?.status === '5' || 
    String(ticket?.status?.name || ticket?.status || '').toLowerCase().includes('résolu') ||
    String(ticket?.status?.name || ticket?.status || '').toLowerCase().includes('resolu');

  console.log('DEBUG ticket.status:', ticket?.status, typeof ticket?.status);
  console.log('DEBUG solutionId:', solutionId);
  console.log('DEBUG isResolved:', isResolved);

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
          {isResolved && (
            <>
              <Button type="button" variant="danger" onClick={() => handleApproveSolution(false)}>
                Refuser la solution
              </Button>
              <Button type="button" variant="success" onClick={() => handleApproveSolution(true)}>
                Approuver la solution
              </Button>
            </>
          )}
          <Button type="submit" variant="success" disabled={isSubmitting}>
            {isSubmitting ? 'Envoi en cours...' : 'Répondre et Sauvegarder'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
