# Guide d'implémentation — Duplication / Multiplication de Tickets Admin

Ce guide explique étape par étape comment ajouter une action de duplication (ou de multiplication) d'un ticket existant directement depuis l'interface d'administration.

---

## 1. Ce qu'il faut faire (Principe)

Pour dupliquer un ticket, nous devons :
1. Ajouter un bouton **"Dupliquer"** dans la colonne d'actions de la liste des tickets.
2. Demander à l'administrateur **combien de fois** il souhaite multiplier/dupliquer ce ticket (via une boîte de dialogue simple).
3. Effectuer les requêtes API `POST` pour cloner :
   - Le ticket principal (titre, description, type, priorité, urgence, impact).
   - Les tâches associées (`TicketTask`), si nécessaire.
   - Les coûts associés (`TicketCost`), si nécessaire.
   - Les équipements liés (`Item_Ticket`), si nécessaire.
4. Actualiser la liste après l'opération.

---

## 2. Fichiers à modifier

1. **[`TicketList.jsx`](file:///d:/shania/itu/L3/glpi/deskflow/src/components/ticket/TicketList.jsx)** : Ajout du bouton d'action dans le tableau et de la fonction de traitement.

---

## 3. Code à intégrer dans `TicketList.jsx`

### Étape 3.1 : Implémenter la fonction de duplication
Ajoutez cette fonction à l'intérieur du composant `TicketList` (par exemple, juste après `handleApproveSolution`) :

```javascript
const handleDuplicateTicket = async (ticket) => {
  // 1. Demander le nombre de duplications souhaitées
  const countStr = window.prompt(`Combien de fois voulez-vous dupliquer le ticket "#${ticket.id} : ${ticket.name}" ?`, "1");
  const count = parseInt(countStr, 10);
  
  if (isNaN(count) || count <= 0) return; // Annulation ou saisie incorrecte

  setIsImporting(true); // Utiliser l'indicateur de chargement / progression si dispo
  try {
    // 2. Récupérer les éléments liés (Tâches, Coûts, Éléments liés) du ticket original
    const [tasks, costs, items] = await Promise.all([
      fetchDataAPIRest(`Ticket/${ticket.id}/TicketTask`).catch(() => []),
      fetchDataAPIRest(`Ticket/${ticket.id}/TicketCost`).catch(() => []),
      fetchDataAPIRest(`Ticket/${ticket.id}/Item_Ticket`).catch(() => [])
    ]);

    const rawTasks = Array.isArray(tasks) ? tasks : (tasks?.data || []);
    const rawCosts = Array.isArray(costs) ? costs : (costs?.data || []);
    const rawItems = Array.isArray(items) ? items : (items?.data || []);

    // 3. Boucler pour créer les N copies
    for (let i = 0; i < count; i++) {
      // Création du ticket principal
      const ticketPayload = {
        input: {
          name: `${ticket.name} (Copie ${i + 1})`,
          content: ticket.content,
          type: ticket.type,
          status: ticket.status?.id || ticket.status || 1,
          priority: ticket.priority?.id || ticket.priority || 3,
          urgency: ticket.urgency?.id || ticket.urgency || 3,
          impact: ticket.impact?.id || ticket.impact || 3,
          date: new Date().toISOString()
        }
      };
      
      const newTicket = await fetchDataAPIRest('Ticket', {
        method: 'POST',
        body: ticketPayload
      });

      if (!newTicket || !newTicket.id) continue;

      // Liaison des équipements (Item_Ticket)
      if (rawItems.length > 0) {
        await Promise.all(
          rawItems.map(item =>
            fetchDataAPIRest('Item_Ticket', {
              method: 'POST',
              body: {
                input: {
                  tickets_id: newTicket.id,
                  items_id: item.items_id,
                  itemtype: item.itemtype
                }
              }
            }).catch(err => console.error("Liaison équipement échouée:", err))
          )
        );
      }

      // Copie des tâches (TicketTask)
      if (rawTasks.length > 0) {
        await Promise.all(
          rawTasks.map(task =>
            fetchDataAPIRest('TicketTask', {
              method: 'POST',
              body: {
                input: {
                  tickets_id: newTicket.id,
                  content: task.content,
                  actiontime: task.actiontime,
                  state: task.state,
                  users_id_tech: task.users_id_tech
                }
              }
            }).catch(err => console.error("Copie tâche échouée:", err))
          )
        );
      }

      // Copie des coûts (TicketCost)
      if (rawCosts.length > 0) {
        await Promise.all(
          rawCosts.map(cost =>
            fetchDataAPIRest('TicketCost', {
              method: 'POST',
              body: {
                input: {
                  tickets_id: newTicket.id,
                  name: cost.name || 'Coût dupliqué',
                  cost_fixed: cost.cost_fixed,
                  cost_time: cost.cost_time,
                  budgetitems_id: cost.budgetitems_id
                }
              }
            }).catch(err => console.error("Copie coût échouée:", err))
          )
        );
      }
    }

    alert(`Succès : ${count} ticket(s) dupliqué(s) avec succès !`);
    loadTickets(); // Recharger la liste des tickets
  } catch (error) {
    alert("Une erreur est survenue lors de la duplication : " + error.message);
  } finally {
    setIsImporting(false);
  }
};
```

---

### Étape 3.2 : Ajouter le bouton dans l'interface
Dans la partie JSX de `TicketList.jsx`, localisez le tableau de rendu et insérez le bouton sous les actions existantes.

**Rechercher :**
```jsx
<Button size="sm" variant="outline" onClick={() => openModalForEdit(ticket)}>
  Modifier
</Button>
```

**Ajouter juste après :**
```jsx
<Button 
  size="sm" 
  variant="secondary" 
  onClick={() => handleDuplicateTicket(ticket)}
>
  Dupliquer
</Button>
```

---

## 4. Ce que cela va modifier à l'usage
* **Gain de temps** : L'administrateur peut cloner instantanément un ticket complexe (avec ses équipements liés, tâches et coûts).
* **Multiplication par lot** : En saisissant un chiffre supérieur à `1` dans le prompt, l'admin peut créer instantanément plusieurs instances du même ticket pour simuler des scénarios ou déclarer le même problème pour plusieurs équipements séparés.
