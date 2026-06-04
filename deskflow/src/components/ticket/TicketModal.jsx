import TicketForm from './TicketForm';
import { fetchGlpiData } from '../../services/apiClient';
import { initialFormData } from '../../utils/TicketHelper';
import { useState } from 'react';

export default function TicketModal({ ticket, users, onClose, onSaved }) {
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
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: 'white', borderRadius: '8px', padding: '24px', width: '640px', maxWidth: '90vw', maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <h3>{ticket ? `Modifier le ticket #${ticket.id}` : 'Créer un ticket'}</h3>
        <form onSubmit={handleSubmit}>
          <TicketForm formData={formData} onChange={handleChange} users={users} />
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
          <button type="button" onClick={onClose} disabled={isSubmitting}>Annuler</button>
        </form>
      </div>
    </div>
  );
}