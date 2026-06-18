# Guide d'implémentation : Flux d'Approbation de Fermeture du Ticket

Ce document présente l'implémentation d'un flux d'approbation métier lors du passage d'un ticket au statut **Terminé** sur le Kanban. 

---

## 1. Description du Scénario Métier

Lorsqu'un utilisateur fait glisser un ticket vers la colonne **Terminé** (ou clique sur un bouton de fermeture) :
1. L'application intercepte l'action et n'effectue pas la mise à jour immédiatement.
2. Une fenêtre modale de détails s'ouvre (inspirée de `TicketFiche`), contenant un formulaire d'approbation.
3. **Cas A : Approbation**
   - L'utilisateur clique sur **Approuver**.
   - Le statut du ticket est directement mis à jour à `6` (Terminé/Clos) via l'API GLPI.
4. **Cas B : Refus**
   - L'utilisateur clique sur **Refuser**.
   - Un champ texte apparaît pour saisir obligatoirement un motif de refus.
   - À la validation, un message de suivi (`ITILFollowup`) est créé avec le motif saisi.
   - Le statut du ticket est forcé/maintenu à `2` (En cours).

---

## 2. Fichiers à créer et modifier

Pour mettre en œuvre ce flux, nous allons :
1. **[Nouveau]** Créer le composant de formulaire d'approbation `TicketApprovalModal.jsx` :
   - Path : `deskflow/src/components/ticket/TicketApprovalModal.jsx`
2. **[Modifier]** Adapter la logique de drop dans `TicketKanban.jsx` :
   - Path : `deskflow/src/components/ticket/TicketKanban.jsx`

---

## 3. Code Source et Explications

### A. Le composant d'Approbation (`TicketApprovalModal.jsx`)
Ce composant gère l'affichage des détails du ticket, la validation de la décision d'approbation et l'envoi des requêtes correspondantes à l'API GLPI.

```jsx
import { useState, useEffect } from 'react';
import { fetchDataAPIRest } from '../../services/apiClient';
import { Button, Spinner, Modal } from '../templates';

export default function TicketApprovalModal({ ticketId, open, onClose, onSuccess }) {
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refusalMode, setRefusalMode] = useState(false);
  const [refusalReason, setRefusalReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && ticketId) {
      setLoading(true);
      fetchDataAPIRest(`Ticket/${ticketId}`)
        .then(data => {
          setTicket(data);
          setLoading(false);
        })
        .catch(err => {
          console.error(err);
          setLoading(false);
        });
    }
  }, [ticketId, open]);

  // Cas A : Approbation -> Clôture directe du ticket (statut 6)
  const handleApprove = async () => {
    setSubmitting(true);
    try {
      await fetchDataAPIRest(`Ticket/${ticketId}`, {
        method: 'PUT',
        body: { input: { id: ticketId, status: 6 } }
      });
      onSuccess(); // Recharger les tickets et fermer la modale
    } catch (err) {
      alert("Erreur lors de l'approbation : " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Cas B : Refus -> Ajouter suivi et forcer statut en cours (statut 2)
  const handleRefuseSubmit = async (e) => {
    e.preventDefault();
    if (!refusalReason.trim()) return;

    setSubmitting(true);
    try {
      // 1. Ajouter le message de suivi expliquant le refus
      await fetchDataAPIRest('ITILFollowup', {
        method: 'POST',
        body: {
          input: {
            items_id: ticketId,
            itemtype: 'Ticket',
            content: `Refus de  : ${refusalReason}`
          }
        }
      });

      // 2. Maintenir ou replacer le ticket en statut 'En cours' (2)
      await fetchDataAPIRest(`Ticket/${ticketId}`, {
        method: 'PUT',
        body: { input: { id: ticketId, status: 2 } }
      });

      onSuccess();
    } catch (err) {
      alert("Erreur lors du refus : " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <Modal
      title={ticket ? `Demande d'approbation — ${ticket.name} #${ticket.id}` : "Chargement..."}
      open={open}
      onClose={onClose}
      className="max-w-lg w-full"
    >
      {loading ? (
        <div className="flex justify-center py-8"><Spinner /></div>
      ) : (
        <div className="space-y-4 text-sm text-neutral-800">
          <p className="text-neutral-600">
            Vous tentez de classer ce ticket comme <strong>Terminé</strong>. Veuillez valider cette action.
          </p>

          {!refusalMode ? (
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
              <Button 
                variant="outline"
                className="border-red-600 text-red-600 hover:bg-red-50"
                onClick={() => setRefusalMode(true)}
                disabled={submitting}
              >
                Refuser la fermeture
              </Button>
              <Button 
                className="bg-green-600 border-green-600 text-white hover:bg-green-700"
                onClick={handleApprove}
                disabled={submitting}
              >
                {submitting ? 'Approbation en cours...' : 'Approuver'}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleRefuseSubmit} className="space-y-3 pt-3 border-t border-neutral-100">
              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  Motif 
                </label>
                <textarea
                  required
                  rows={3}
                  className="w-full border border-neutral-300 rounded-lg p-2.5 focus:ring-2 focus:ring-black focus:outline-none"
                  placeholder="Pourquoi refusez-vous la fermeture de ce ticket ?"
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
                  onClick={() => { setRefusalMode(false); setRefusalReason(''); }}
                  disabled={submitting}
                >
                  Retour
                </Button>
                <Button 
                  type="submit" 
                  className="bg-black text-white hover:bg-neutral-800"
                  disabled={!refusalReason.trim() || submitting}
                >
                  {submitting ? 'Envoi...' : 'Valider le refus'}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}
```

---

### B. Intégration dans le Kanban (`TicketKanban.jsx`)

Nous devons intercepter le déplacement vers la colonne 'Terminé' et ouvrir notre nouvelle modale au lieu d'effectuer la mise à jour immédiate.

#### 1. Importation du composant
```javascript
import TicketApprovalModal from './TicketApprovalModal';
```

#### 2. Déclaration des états locaux dans `TicketKanban`
```javascript
const [approvalTicketId, setApprovalTicketId] = useState(null);
const [isApprovalOpen, setIsApprovalOpen] = useState(false);
```

#### 3. Interception dans la logique de Drop et de déplacement de cartes

Dans le JSX du Kanban (événements `onCardMove` et `onDrop` de `Kanban.Column`), modifiez l'exécution de la mise à jour :

```javascript
// A. Dans l'événement de Kanban :
<Kanban onCardMove={async (ticketId, sourceColId, targetColId) => {
    if (targetColId === 'termine') {
        // Intercepter et ouvrir la modale d'approbation
        setApprovalTicketId(ticketId);
        setIsApprovalOpen(true);
    } else {
        // Logique normale pour les autres colonnes
        const newStatusId = statusMap[targetColId];
        if (ticketId && newStatusId) {
            await updateTicketStatus(ticketId, newStatusId);
            loadTickets();
        }
    }
}}>

// B. Dans le onDrop de Kanban.Column 'termine' :
onDrop={async (e) => {
    e.preventDefault();
    setActiveColumnId(null);
    const ticketId = e.dataTransfer.getData('cardId');
    
    if (status.id === 'termine') {
        // Intercepter
        setApprovalTicketId(ticketId);
        setIsApprovalOpen(true);
    } else {
        // Logique normale pour les autres colonnes
        const newStatusId = statusMap[status.id];
        if (ticketId && newStatusId) {
            await updateTicketStatus(ticketId, newStatusId);
            loadTickets();
        }
    }
}}
```

#### 4. Ajout de la modale dans le rendu JSX de `TicketKanban`
Ajoutez le composant au bas de votre rendu JSX :

```jsx
{isApprovalOpen && (
    <TicketApprovalModal
        ticketId={approvalTicketId}
        open={isApprovalOpen}
        onClose={() => {
            setIsApprovalOpen(false);
            setApprovalTicketId(null);
        }}
        onSuccess={() => {
            setIsApprovalOpen(false);
            setApprovalTicketId(null);
            loadTickets(); // Recharger le Kanban avec les nouveaux statuts
        }}
    />
)}
```
