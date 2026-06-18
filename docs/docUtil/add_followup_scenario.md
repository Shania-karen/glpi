# Scénario : Ajouter un Suivi (Follow-up) lors de la Clôture d'un Ticket

Si lors du Glisser-Déposer dans le **Kanban** vous souhaitez obliger (ou proposer) à l'utilisateur d'ajouter un commentaire / suivi au moment de passer un ticket de "En cours" à "Clos", voici le code nécessaire à implémenter.

Dans GLPI, les suivis sont gérés par l'endpoint `ITILFollowup`.

---

## 1. La Fonction API (`addFollowup`)

Ajoutez cette fonction dans votre fichier d'utilitaires API (ex: `src/utils/ticketHelper.js` ou `src/services/apiClient.js`) :

```javascript
import { fetchDataAPIRest } from '../services/apiClient'; // Ajustez l'import selon votre projet

/**
 * Ajoute un suivi (follow-up) à un ticket GLPI.
 * 
 * @param {number|string} ticketId - L'ID du ticket
 * @param {string} content - Le message du suivi
 * @param {boolean} isPrivate - Si le suivi doit être privé (invisible pour le demandeur)
 * @returns {Promise<Object>} La réponse de l'API GLPI
 */
export async function addTicketFollowup(ticketId, content, isPrivate = false) {
  try {
    const response = await fetchDataAPIRest('/ITILFollowup', {
      method: 'POST',
      body: {
        input: {
          itemtype: 'Ticket',
          items_id: parseInt(ticketId, 10),
          content: content,
          is_private: isPrivate ? 1 : 0
        }
      }
    });
    
    console.log('Suivi ajouté avec succès:', response);
    return response;
  } catch (error) {
    console.error('Erreur lors de l\'ajout du suivi:', error);
    throw error;
  }
}
```

---

## 2. Intégration dans le Kanban (Exemple avec un `prompt` ou une Modal)

Lorsque l'utilisateur glisse le ticket vers la colonne "Clos" (Status ID: 6), vous pouvez intercepter l'action pour demander un commentaire.

Voici comment modifier l'événement de dépôt (`onDragEnd` ou similaire) dans votre composant **Kanban** :

```jsx
import { updateTicketStatus } from '../../utils/ticketHelper';
import { addTicketFollowup } from '../../utils/ticketHelper'; // Importer la nouvelle fonction

// ... dans votre composant Kanban ...

const handleDragEnd = async (result) => {
  const { destination, source, draggableId } = result;

  // Si on le lâche au même endroit ou en dehors des colonnes, on annule
  if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
    return;
  }

  const ticketId = draggableId;
  const oldStatusId = parseInt(source.droppableId, 10);
  const newStatusId = parseInt(destination.droppableId, 10);

  // === SCÉNARIO : FERMETURE DE TICKET ===
  // Si le nouveau statut est "Clos" (6) ou "Résolu" (5)
  if (newStatusId === 6 || newStatusId === 5) {
    
    // Demander le motif de clôture (peut être remplacé par une belle Modal UI)
    const followupContent = window.prompt(
      "Vous clôturez ce ticket. Veuillez entrer un commentaire ou un motif de résolution :"
    );

    // Si l'utilisateur clique sur "Annuler" dans le prompt, on bloque le déplacement
    if (followupContent === null) {
       console.log("Déplacement annulé par l'utilisateur.");
       return; 
    }

    // S'il a tapé un texte, on ajoute d'abord le suivi dans GLPI
    if (followupContent.trim() !== "") {
      try {
        await addTicketFollowup(ticketId, followupContent);
      } catch (err) {
        alert("Erreur lors de l'enregistrement du commentaire. Le ticket ne sera pas clos.");
        return;
      }
    }
  }

  // === MISE À JOUR NORMALE DU STATUT ===
  try {
    // Appel pour changer le statut dans GLPI (et SQLite via le helper)
    await updateTicketStatus(ticketId, newStatusId, oldStatusId);
    
    // Mettre à jour l'état local (UI React) pour refléter le changement
    // setTickets(...) 
    
  } catch (error) {
    console.error("Erreur lors du déplacement :", error);
  }
};
```

### Bonnes pratiques :
Au lieu d'utiliser `window.prompt` (qui bloque l'interface), il est recommandé de déclencher l'ouverture d'un composant `<Modal>` contenant un `<textarea>`. La logique reste la même : bloquer le changement de statut `updateTicketStatus` tant que le formulaire de la modale n'est pas validé.
