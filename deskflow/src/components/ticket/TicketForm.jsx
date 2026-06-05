import { generateDurationOptions } from '../../utils/TicketHelper';
import { H3, Input, Select, Textarea, FormGroup, Divider } from '../templates';

const durationOptions = generateDurationOptions();

export default function TicketForm({ formData, onChange, users, assets }) {
  return (
    <div className="space-y-6">

      {/* General */}
      <div>
        <H3 className="mb-4">General</H3>
        <div className="space-y-4">
          <FormGroup label="Titre" required>
            <Input type="text" name="name" value={formData.name} onChange={onChange} required />
          </FormGroup>

          <FormGroup label="Description">
            <Textarea name="content" value={formData.content} onChange={onChange} rows={4} />
          </FormGroup>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormGroup label="Date d'ouverture">
              <Input type="datetime-local" name="date" value={formData.date} onChange={onChange} />
            </FormGroup>

            <FormGroup label="Type">
              <Select name="type" value={formData.type} onChange={onChange}>
                <option value="1">Incident</option>
                <option value="2">Demande</option>
              </Select>
            </FormGroup>

            <FormGroup label="Categorie">
              <Select name="itilcategories_id" value={formData.itilcategories_id} onChange={onChange}>
                <option value="">-----</option>
                <option value="1">Materiel</option>
                <option value="2">Logiciel</option>
              </Select>
            </FormGroup>

            <FormGroup label="Statut">
              <Select name="status" value={formData.status} onChange={onChange}>
                <option value="1">Nouveau</option>
                <option value="2">En cours (Attribue)</option>
                <option value="3">En cours (Planifie)</option>
                <option value="4">En attente</option>
                <option value="5">Resolu</option>
                <option value="6">Clos</option>
              </Select>
            </FormGroup>

            <FormGroup label="Source de la demande">
              <Select name="requesttypes_id" value={formData.requesttypes_id} onChange={onChange}>
                <option value="1">Helpdesk</option>
                <option value="2">Email</option>
                <option value="3">Telephone</option>
              </Select>
            </FormGroup>

            <FormGroup label="ID externe">
              <Input type="text" name="external_id" value={formData.external_id} onChange={onChange} />
            </FormGroup>
          </div>
        </div>
      </div>

      <Divider />

      {/* Priorite & Duree */}
      <div>
        <H3 className="mb-4">Priorite et Duree</H3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormGroup label="Urgence">
            <Select name="urgency" value={formData.urgency} onChange={onChange}>
              <option value="5">Tres haute</option>
              <option value="4">Haute</option>
              <option value="3">Moyenne</option>
              <option value="2">Basse</option>
              <option value="1">Tres basse</option>
            </Select>
          </FormGroup>

          <FormGroup label="Impact">
            <Select name="impact" value={formData.impact} onChange={onChange}>
              <option value="5">Tres haut</option>
              <option value="4">Haut</option>
              <option value="3">Moyen</option>
              <option value="2">Bas</option>
              <option value="1">Tres bas</option>
            </Select>
          </FormGroup>

          <FormGroup label="Priorite">
            <Select name="priority" value={formData.priority} onChange={onChange}>
              <option value="6">Majeure</option>
              <option value="5">Tres haute</option>
              <option value="4">Haute</option>
              <option value="3">Moyenne</option>
              <option value="2">Basse</option>
              <option value="1">Tres basse</option>
            </Select>
          </FormGroup>

          <FormGroup label="Duree totale">
            <Select name="actiontime" value={formData.actiontime} onChange={onChange}>
              {durationOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          </FormGroup>
        </div>
      </div>

      <Divider />

      {/* Acteurs */}
      <div>
        <H3 className="mb-4">Acteurs</H3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormGroup label="Demandeur">
            <Select name="_users_id_requester" value={formData._users_id_requester} onChange={onChange}>
              <option value="">-----</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username || `${u.firstname} ${u.realname}`}</option>)}
            </Select>
          </FormGroup>

          <FormGroup label="Observateur">
            <Select name="_users_id_observer" value={formData._users_id_observer} onChange={onChange}>
              <option value="">-----</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username || `${u.firstname} ${u.realname}`}</option>)}
            </Select>
          </FormGroup>

          <FormGroup label="Attribue a">
            <Select name="_users_id_assign" value={formData._users_id_assign} onChange={onChange}>
              <option value="">-----</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.username || `${u.firstname} ${u.realname}`}</option>)}
            </Select>
          </FormGroup>
        </div>
      </div>

      <Divider />

      {/* Elements */}
      <div>
        <H3 className="mb-4">Elements</H3>
        <FormGroup label="Element associe">
          <Select name="items_id" value={formData.items_id} onChange={onChange}>
            <option value="">-----</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </FormGroup>
      </div>

    </div>
  );
}