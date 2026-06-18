import { useState, useEffect } from 'react';
import { fetchDataAPIRest } from '../../services/apiClient';
import { Button, Spinner, Modal, Input , Select} from '../templates';
import { reopenTicketWithCosts, cancelTicketCosts , reopenTicketWithCostsModeFour, reopenTicketWithCostsModeThree, reopenTicketWithCostsModeTwo} from '../../services/coutWorkflowService';

const STEP_CHOICE = 'choice';
const STEP_FORM   = 'form';

export default function TicketApprovalFormModal({ ticketId, open, onClose, onSuccess }) {
  const [ticket, setTicket]           = useState(null);
  const [loading, setLoading]         = useState(true);

  const [mvt, setMvt] = useState('reopenTicketWithCosts');
  const [submitting, setSubmitting]   = useState(false);
  const [step, setStep]               = useState(STEP_CHOICE);
  const [percentage, setPercentage]   = useState('');

  useEffect(() => {
    if (open && ticketId) {
      setLoading(true);
      setStep(STEP_CHOICE);
      setPercentage('');
      fetchDataAPIRest(`Ticket/${ticketId}`)
        .then(data => { setTicket(data); setLoading(false); })
        .catch(err  => { console.error(err); setLoading(false); });
    }
  }, [ticketId, open]);

  if (!open) return null;

  const handleAnnulation = async () => {
    setSubmitting(true);
    try {
      // Appel du service centralisé unifié
      await cancelTicketCosts(ticketId, { updateGLPIStatus: true });
      onSuccess();
    } catch (err) {
      alert("Erreur lors de l'annulation : " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // CAS 2 : Réouverture
  // ─────────────────────────────────────────────────────────────────────────
  const handleReouverture = async (e) => {
    e.preventDefault();
    const pct = parseFloat(percentage);
    if (isNaN(pct) || pct <= 0) {
      alert('Veuillez saisir un pourcentage valide (> 0).');
      return;
    }

    setSubmitting(true);
    try {
      if(mvt ==='reopenTicketWithCosts'){
        await reopenTicketWithCosts(ticketId, pct, { updateGLPIStatus: true });
        onSuccess();
      }else if (mvt ==='reopenTicketWithCostsModeTwo'){
         await reopenTicketWithCostsModeTwo(ticketId, pct, { updateGLPIStatus: true });
        onSuccess();
      }else if(mvt ==='reopenTicketWithCostsModeThree'){
         await reopenTicketWithCostsModeThree(ticketId, pct, { updateGLPIStatus: true });
        onSuccess();
      }else if(mvt ==='reopenTicketWithCostsModeFour'){
         await reopenTicketWithCostsModeFour(ticketId, pct, { updateGLPIStatus: true });
        onSuccess();
      }
        
    } catch (err) {
      alert('Erreur lors de la réouverture : ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={ticket ? `Réouverture — ${ticket.name} #${ticket.id}` : 'Chargement...'}
      open={open}
      onClose={onClose}
      className="max-w-lg w-full"
    >
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="space-y-4 text-sm text-neutral-800">

          {/* ── ÉTAPE 1 : Choix Annuler / Réouverture ── */}
          {step === STEP_CHOICE && (
            <>
              <p className="text-neutral-600">
                Ce ticket est <strong>terminé</strong> et vous souhaitez le remettre <strong>en cours</strong>.
                Choisissez une action :
              </p>
              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
                <Button
                  variant="outline"
                  onClick={handleAnnulation}
                  disabled={submitting}
                >
                  {submitting ? 'En cours...' : 'Annuler (supprimer les coûts)'}
                </Button>
                <Button
                  className="bg-black text-white hover:bg-neutral-800"
                  onClick={() => setStep(STEP_FORM)}
                  disabled={submitting}
                >
                  Réouverture
                </Button>
              </div>
            </>
          )}

          {/* ── ÉTAPE 2 : Formulaire % de réouverture ── */}
          {step === STEP_FORM && (
            <form className="space-y-4 pt-3 border-t border-neutral-100" onSubmit={handleReouverture}>
              <p className="text-neutral-600">
                Saisissez le <strong>pourcentage du coût</strong> à facturer pour cette réouverture.
                <br />
                <span className="text-xs text-neutral-400">
                  Coût réouverture = SuperCout × (% / 100)
                  &nbsp;— le SuperCout utilisé est le dernier enregistré (MAX timestamp).
                </span>
              </p>
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  % du coût de réouverture
                </label>
                   <Select 
                    value={mvt} 
                    onChange={(e) => {
                      setMvt(e.target.value);
                      
                    }}
                    disabled={loading}
                  >
                    <option value="reopenTicketWithCosts">mode 1</option>
                    <option value="reopenTicketWithCostsModeTwo">mode 2</option>
                    <option value="reopenTicketWithCostsModeThree">mode 3</option>
                    <option value="reopenTicketWithCostsModeFour">mode 4</option>
                  </Select>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100"
                  name="percentage"
                  value={percentage}
                  onChange={(e) => setPercentage(e.target.value)}
                  placeholder="ex: 25.00"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(STEP_CHOICE)}
                  disabled={submitting}
                >
                  Retour
                </Button>
                <Button
                  type="submit"
                  className="bg-black text-white hover:bg-neutral-800"
                  disabled={submitting || !percentage}
                >
                  {submitting ? 'Envoi...' : 'Valider la réouverture'}
                </Button>
              </div>
            </form>
          )}

        </div>
      )}
    </Modal>
  );
}