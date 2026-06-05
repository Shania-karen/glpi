import TicketForm from './TicketForm';
import { fetchGlpiData } from '../../services/apiClient';
import { initialFormData } from '../../utils/TicketHelper';
import { useState } from 'react';
import { Modal, Button } from '../templates';

export default function TicketModal({ ticket, users, assets, onClose, onSaved }) {
  const [formData, setFormData] = useState({ ...initialFormData, ...(ticket || {}) });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (ticket) {
        await fetchGlpiData(`Assistance/Ticket/${ticket.id}`, { method: 'PATCH', body: { id: ticket.id, ...formData } });
      } else {
        await fetchGlpiData('Assistance/Ticket', { method: 'POST', body: formData });
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
        <Modal.Body>
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