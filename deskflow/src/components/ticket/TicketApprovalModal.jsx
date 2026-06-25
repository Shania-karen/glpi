import { useState, useEffect } from 'react';
import { fetchDataAPIRest } from '../../services/apiClient';
import { Button, Spinner, Modal, Input } from '../templates';
import { closeTicketWithCosts } from '../../services/coutWorkflowService';

export default function TicketApprovalModal({ element, ticketId, open, onClose, onSuccess }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refusalReason, setRefusalReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ super_cost: 0 });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (open && ticketId) {
      console.log('[TicketApprovalModal] ticketId =', ticketId, '| element =', element);
      setLoading(true);
      fetchDataAPIRest(`Ticket/${ticketId}`)
        .then(data => { setTicket(data); setLoading(false); })
        .catch(err  => { console.error(err); setLoading(false); });
    }
  }, [ticketId, open]);

  // ── Approbation simple : passage statut 6 (fermé) ──────────────────────
  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await fetchDataAPIRest(`Ticket/${ticketId}`, {
        method: 'PUT',
        body: { input: { id: ticketId, status: 6 } },
      });
      onSuccess();
    } catch (err) {
      alert("Erreur lors de l'approbation : " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Refus + SuperCout : statut 6 + enregistrement ligne par item dans couts ─────
  const handleRefuseSubmit = async (e) => {
    e.preventDefault();
    if (!refusalReason.trim()) return;

    setSubmitting(true);
    try {
      const totalCout = parseFloat(formData.super_cost || 0);
      
      const plafondVal= parseFloat(formData.plafond || 0);
      await closeTicketWithCosts(ticketId, totalCout, {
        updateGLPIStatus: true,
        followupContent: `Motif : ${refusalReason}`,
        plafond: plafondVal
      });

      onSuccess();
    } catch (err) {
      alert('Erreur lors du refus : ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };  

  if (!open) return null;

  return (
    <Modal
      title={ticket ? `Demande d'approbation — ${ticket.name} #${ticket.id}` : 'Chargement...'}
      open={open}
      onClose={onClose}
      className="max-w-lg w-full"
    >
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="space-y-4 text-sm text-neutral-800">
          <form onSubmit={handleRefuseSubmit} className="space-y-3 pt-3 border-t border-neutral-100">
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                Super Coût
              </label>
              <p className="text-xs text-neutral-400 mb-2">
                Saisissez le super coût à facturer pour ce ticket (type : <strong>Supercout</strong>).
              </p>
              <Input
                type="number"
                step="0.01"
                min="0"
                name="super_cost"
                onChange={handleChange}
                value={formData.super_cost !== undefined ? formData.super_cost : 0}
                placeholder="0.00"
              />
            </div>
              <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                plafond
              </label>
               <Input
                type="number"
                step="0.01"
                min="0"
                name="plafond"
                onChange={handleChange}
                value={formData.plafond !== undefined ? formData.plafond : 0}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                Motif de refus
              </label>
              <textarea
                required
                rows={3}
                className="w-full border border-neutral-300 rounded-lg p-2.5 focus:ring-2 focus:ring-black focus:outline-none"
                placeholder="Expliquez le motif..."
                value={refusalReason}
                onChange={(e) => setRefusalReason(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="text-neutral-500 border-neutral-200"
                onClick={onClose}
                disabled={submitting}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                className="bg-black text-white hover:bg-neutral-800"
                disabled={!refusalReason.trim() || submitting}
              >
                {submitting ? 'Envoi...' : 'Valider'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </Modal>
  );
}