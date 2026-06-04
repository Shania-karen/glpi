import { generateDurationOptions } from '../../utils/TicketHelper';

const durationOptions = generateDurationOptions();

export default function TicketForm({ formData, onChange, users }) {
  return (
    <>
      <h3>Général</h3>
      <div>
        <div style={{ marginBottom: '10px' }}>
          <label>Titre : </label>
          <input type="text" name="name" value={formData.name} onChange={onChange} required style={{ width: '100%' }} />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Description : </label>
          <textarea name="content" value={formData.content} onChange={onChange} rows="4" style={{ width: '100%' }} />
        </div>

        <div>
          <label>Date d'ouverture</label>
          <input type="datetime-local" name="date" value={formData.date} onChange={onChange} />
        </div>

        <div>
          <label>Type</label>
          <select name="type" value={formData.type} onChange={onChange}>
            <option value="1">Incident</option>
            <option value="2">Demande</option>
          </select>
        </div>

        <div>
          <label>Catégorie</label>
          <select name="itilcategories_id" value={formData.itilcategories_id} onChange={onChange}>
            <option value="">-----</option>
            <option value="1">Matériel</option>
            <option value="2">Logiciel</option>
          </select>
        </div>

        <div>
          <label>Statut</label>
          <select name="status" value={formData.status} onChange={onChange}>
            <option value="1">Nouveau</option>
            <option value="2">En cours (Attribué)</option>
            <option value="3">En cours (Planifié)</option>
            <option value="4">En attente</option>
            <option value="5">Résolu</option>
            <option value="6">Clos</option>
          </select>
        </div>

        <div>
          <label>Source de la demande</label>
          <select name="requesttypes_id" value={formData.requesttypes_id} onChange={onChange}>
            <option value="1">Helpdesk</option>
            <option value="2">Email</option>
            <option value="3">Téléphone</option>
          </select>
        </div>

        <div>
          <label>ID externe</label>
          <input type="text" name="external_id" value={formData.external_id} onChange={onChange} />
        </div>
      </div>

      <h3>Priorité & Durée</h3>
      <div>
        <div>
          <label>Urgence</label>
          <select name="urgency" value={formData.urgency} onChange={onChange}>
            <option value="5">Très haute</option>
            <option value="4">Haute</option>
            <option value="3">Moyenne</option>
            <option value="2">Basse</option>
            <option value="1">Très basse</option>
          </select>
        </div>

        <div>
          <label>Impact</label>
          <select name="impact" value={formData.impact} onChange={onChange}>
            <option value="5">Très haut</option>
            <option value="4">Haut</option>
            <option value="3">Moyen</option>
            <option value="2">Bas</option>
            <option value="1">Très bas</option>
          </select>
        </div>

        <div>
          <label>Priorité</label>
          <select name="priority" value={formData.priority} onChange={onChange}>
            <option value="6">Majeure</option>
            <option value="5">Très haute</option>
            <option value="4">Haute</option>
            <option value="3">Moyenne</option>
            <option value="2">Basse</option>
            <option value="1">Très basse</option>
          </select>
        </div>

        <div>
          <label>Durée totale</label>
          <select name="actiontime" value={formData.actiontime} onChange={onChange}>
            {durationOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      <h3>Acteurs</h3>
      <div>
        <label>Demandeur</label>
        <select name="_users_id_requester" value={formData._users_id_requester} onChange={onChange}>
          <option value="">-----</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.username || `${u.firstname} ${u.realname}`}</option>)}
        </select>
      </div>

      <div>
        <label>Observateur</label>
        <select name="_users_id_observer" value={formData._users_id_observer} onChange={onChange}>
          <option value="">-----</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.username || `${u.firstname} ${u.realname}`}</option>)}
        </select>
      </div>

      <div>
        <label>Attribué à</label>
        <select name="_users_id_assign" value={formData._users_id_assign} onChange={onChange}>
          <option value="">-----</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.username || `${u.firstname} ${u.realname}`}</option>)}
        </select>
      </div>

      <h3>Éléments</h3>
      <div>
        <label>Lier un élément</label>
        <select name="items_id" value={formData.items_id} onChange={onChange}>
          <option value="">-----</option>
          <optgroup label="Recherche complète">
            <option value="Computer">Ordinateur</option>
            <option value="Software">Logiciel</option>
            <option value="Printer">Imprimante</option>
            <option value="NetworkEquipment">Matériel réseau</option>
            <option value="Monitor">Moniteur</option>
            <option value="Peripheral">Périphérique</option>
            <option value="Phone">Téléphone</option>
            <option value="Enclosure">Baie</option>
            <option value="Database">Base de données</option>
          </optgroup>
        </select>
      </div>
    </>
  );
}