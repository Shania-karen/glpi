import TicketForm from './TicketForm';
import { fetchGlpiData, fetchDataAPIRest } from '../../services/apiClient';
import { initialFormData } from '../../utils/TicketHelper';
import { useState, useEffect } from 'react';
import { Modal, Button } from '../templates';

export default function TicketModal({ ticket, users, assets, onClose, onSaved }) {
  const [formData, setFormData] = useState({ ...initialFormData, ...(ticket || {}) });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  useEffect(() => {
    if (ticket && ticket.id) {
      fetchDataAPIRest(`Ticket/${ticket.id}/TicketCost`).then(costs => {
        const rawCosts = Array.isArray(costs) ? costs : (costs?.data || []);
        if (rawCosts.length > 0) {
          const firstCost = rawCosts[0];
          const durationSeconds = parseInt(ticket.actiontime?.value || ticket.actiontime || 0, 10);
          const durationHours = durationSeconds / 3600;
          const totalCostTime = parseFloat(firstCost.cost_time?.value || firstCost.cost_time || 0);
          const hourlyRate = durationHours > 0 ? (totalCostTime / durationHours) : totalCostTime;

          setFormData(prev => ({
            ...prev,
            cost_fixed: parseFloat(firstCost.cost_fixed?.value || firstCost.cost_fixed || 0),
            cost_time: hourlyRate,
            _cost_id: firstCost.id
          }));
        }
      }).catch(err => console.warn("Erreur récupération coûts:", err));
    }
  }, [ticket]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { items_ids } = formData;
      
      const allowedFields = [
        'id', 'name', 'content', 'date', 'type', 'itilcategories_id', 
        'status', 'requesttypes_id', 'external_id', 'urgency', 'impact', 
        'priority', 'actiontime'
      ];
      
      const ticketPayload = {};
      allowedFields.forEach(field => {
        if (formData[field] !== undefined) {
          if (formData[field] && typeof formData[field] === 'object') {
            ticketPayload[field] = formData[field].id;
          } else {
            ticketPayload[field] = formData[field];
          }
        }
      });

      let currentTicketId = ticket?.id;
      if (ticket) {
        await fetchGlpiData(`/Assistance/Ticket/${ticket.id}`, { 
          method: 'PATCH', 
          body: ticketPayload 
        });
      } else {
        const response = await fetchGlpiData('/Assistance/Ticket', { 
          method: 'POST', 
          body: ticketPayload 
        });
        currentTicketId = response.id;
      }

      // Gestion des coûts financiers
      const fCost = parseFloat(formData.cost_fixed) || 0;
      const hourlyRate = parseFloat(formData.cost_time) || 0;
      const durationSeconds = parseInt(formData.actiontime) || 0;
      const tCost = (durationSeconds / 3600) * hourlyRate;

      if (formData._cost_id) {
        await fetchDataAPIRest(`TicketCost/${formData._cost_id}`, {
          method: 'PUT',
          body: {
            input: {
              id: formData._cost_id,
              cost_fixed: fCost,
              cost_time: tCost,
              actiontime: durationSeconds,
            }
          }
        });
      } else if (fCost > 0 || tCost > 0) {
        await fetchDataAPIRest('TicketCost', {
          method: 'POST',
          body: {
            input: {
              tickets_id: currentTicketId,
              cost_fixed: fCost,
              cost_time: tCost,
              actiontime: durationSeconds,
              name: 'Coût initial'
            }
          }
        });
      }

      if (items_ids && items_ids.length > 0) {
        const liaisonsPayload = items_ids.map(item => {
          const parsed = JSON.parse(item);
          return {
            tickets_id: currentTicketId,
            itemtype: parsed.itemtype,
            items_id: parsed.id
          };
        });

        await fetchDataAPIRest('Item_Ticket', {
          method: 'POST',
          body: { input: liaisonsPayload }
        });
      }

      // Synchronisation manuelle des acteurs (Demandeur, Assigné, Observateur) lors d'une modification
      if (ticket) {
        const syncActor = async (tId, uId, type) => {
          const existingLinks = await fetchDataAPIRest(`Ticket/${tId}/Ticket_User`).catch(()=>[]);
          const oldLink = existingLinks.find(l => l.type === type);
          
          if (oldLink) {
            if (uId && String(oldLink.users_id) === String(uId)) return; // Pas de changement
            await fetchDataAPIRest(`Ticket_User/${oldLink.id}`, { method: 'DELETE' });
          }
          
          if (uId) {
            await fetchDataAPIRest('Ticket_User', {
              method: 'POST',
              body: { input: { tickets_id: tId, users_id: parseInt(uId), type: type } }
            });
          }
        };

        if (formData._users_id_assign !== undefined) await syncActor(currentTicketId, formData._users_id_assign, 2);
        if (formData._users_id_requester !== undefined) await syncActor(currentTicketId, formData._users_id_requester, 1);
        if (formData._users_id_observer !== undefined) await syncActor(currentTicketId, formData._users_id_observer, 3);
      }
      onSaved();
      onClose();
    } catch (err) {
      alert("Erreur : " + err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      title={ticket ? `Modifier le ticket #${ticket.id}` : 'Creer un ticket'}
      open={true}
      onClose={onClose}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit}>
        <Modal.Body className="max-h-[70vh] overflow-y-auto">
          <TicketForm formData={formData} onChange={handleChange} users={users} assets={assets} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}