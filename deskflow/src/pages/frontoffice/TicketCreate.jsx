import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsers } from '../../hooks/useUser';
import { useAssets } from '../../hooks/useAssets';
import TicketForm from '../../components/ticket/TicketForm';
import { Button, H2, Spinner } from '../../components/templates';
import { initialFormData } from '../../utils/TicketHelper';
import { fetchGlpiData, fetchDataAPIRest } from '../../services/apiClient';

export default function TicketCreate() {
  const { users } = useUsers();
  const { assets, loading: assetsLoading } = useAssets();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ ...initialFormData });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { items_ids, ...ticketData } = formData;
      
      const response = await fetchGlpiData('/Assistance/Ticket', { 
        method: 'POST', 
        body: ticketData 
      });
      const currentTicketId = response.id;

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

      navigate('/tickets');
    } catch (err) {
      alert("Erreur lors de la création du ticket : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (assetsLoading) {
    return <div className="p-10 flex justify-center"><Spinner label="Chargement du formulaire..." /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-8">
        <H2>Créer un Ticket</H2>
        <p className="text-neutral-500 text-sm mt-1">Déclarez un incident ou faites une demande en y associant vos éléments.</p>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-xl border border-neutral-200 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <TicketForm formData={formData} onChange={handleChange} users={users} assets={assets} />
          
          <div className="flex justify-end pt-6 border-t border-neutral-200 gap-3">
            <Button variant="outline" type="button" onClick={() => navigate('/tickets')} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Création en cours...' : 'Soumettre le ticket'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
