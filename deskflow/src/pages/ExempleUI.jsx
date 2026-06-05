import { useState } from 'react';
import {
  H1, H2, H3, H4, P, Text,
  Button, Card, Badge,
  Table, Th, Tr, Td,
  Input, Select, Textarea, Label, FormGroup,
  Modal, Alert, Spinner, Divider,
} from '../components/templates';

export default function ExempleUI() {
  const [modalOpen, setModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [textareaValue, setTextareaValue] = useState('');
  const [alertVisible, setAlertVisible] = useState(true);

  return (
    <div className="space-y-10">

      {/* Headings */}
      <section>
        <H2 className="mb-4">Headings</H2>
        <Card>
          <Card.Body className="space-y-3 text-left">
            <H1>Heading H1</H1>
            <H2>Heading H2</H2>
            <H3>Heading H3</H3>
            <H4>Heading H4</H4>
            <P>Ceci est un paragraphe (P) — lorem ipsum dolor sit amet, consectetur adipiscing elit.</P>
            <div className="flex gap-3 flex-wrap">
              <Text>Text default</Text>
              <Text variant="sm">Text sm</Text>
              <Text variant="xs">Text xs</Text>
              <Text variant="muted">Text muted</Text>
            </div>
          </Card.Body>
        </Card>
      </section>

      <Divider />

      {/* Buttons */}
      <section>
        <H2 className="mb-4">Buttons</H2>
        <Card>
          <Card.Body>
            <H4 className="mb-3">Variants</H4>
            <div className="flex flex-wrap gap-3 mb-6">
              <Button variant="primary" onClick={() => alert('Primary')}>Primary</Button>
              <Button variant="secondary" onClick={() => alert('Secondary')}>Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="success">Success</Button>
              <Button variant="warning">Warning</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" disabled>Disabled</Button>
            </div>

            <H4 className="mb-3">Sizes</H4>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
          </Card.Body>
        </Card>
      </section>

      <Divider />

      {/* Badges */}
      <section>
        <H2 className="mb-4">Badges</H2>
        <Card>
          <Card.Body>
            <div className="flex flex-wrap gap-3">
              <Badge>Default</Badge>
              <Badge variant="dark">Dark</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
            </div>
          </Card.Body>
        </Card>
      </section>

      <Divider />

      {/* Forms */}
      <section>
        <H2 className="mb-4">Formulaires</H2>
        <Card>
          <Card.Body className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormGroup label="Nom" required htmlFor="nom">
                <Input
                  id="nom"
                  placeholder="Entrez votre nom..."
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                />
              </FormGroup>

              <FormGroup label="Email (erreur)" required error="L'email est requis">
                <Input type="email" placeholder="email@example.com" error />
              </FormGroup>

              <FormGroup label="Categorie" htmlFor="categorie">
                <Select
                  id="categorie"
                  value={selectValue}
                  onChange={e => setSelectValue(e.target.value)}
                >
                  <option value="">-- Choisir --</option>
                  <option value="materiel">Materiel</option>
                  <option value="logiciel">Logiciel</option>
                  <option value="reseau">Reseau</option>
                </Select>
              </FormGroup>

              <FormGroup label="Priorite">
                <Select>
                  <option value="3">Moyenne</option>
                  <option value="4">Haute</option>
                  <option value="5">Urgente</option>
                </Select>
              </FormGroup>
            </div>

            <FormGroup label="Description">
              <Textarea
                rows={3}
                placeholder="Decrivez le probleme..."
                value={textareaValue}
                onChange={e => setTextareaValue(e.target.value)}
              />
            </FormGroup>

            <P className="text-xs text-neutral-400">
              Valeur input : <strong>{inputValue || '—'}</strong> | 
              Select : <strong>{selectValue || '—'}</strong> | 
              Textarea : <strong>{textareaValue.length} chars</strong>
            </P>
          </Card.Body>
          <Card.Footer>
            <Button variant="outline" onClick={() => { setInputValue(''); setSelectValue(''); setTextareaValue(''); }}>
              Reinitialiser
            </Button>
            <Button onClick={() => alert(`Nom: ${inputValue}\nCat: ${selectValue}\nDesc: ${textareaValue}`)}>
              Soumettre
            </Button>
          </Card.Footer>
        </Card>
      </section>

      <Divider />

      {/* Table */}
      <section>
        <H2 className="mb-4">Table</H2>
        <Table>
          <thead>
            <Tr>
              <Th>ID</Th>
              <Th>Titre</Th>
              <Th>Statut</Th>
              <Th>Priorite</Th>
              <Th>Actions</Th>
            </Tr>
          </thead>
          <tbody>
            <Tr onClick={() => alert('Ligne 1 cliquee')}>
              <Td>001</Td>
              <Td>Imprimante hors service</Td>
              <Td><Badge>En cours</Badge></Td>
              <Td><Badge variant="dark">Haute</Badge></Td>
              <Td>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); alert('Modifier #001'); }}>Modifier</Button>
                  <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); alert('Supprimer #001'); }}>Supprimer</Button>
                </div>
              </Td>
            </Tr>
            <Tr>
              <Td>002</Td>
              <Td>Acces VPN impossible</Td>
              <Td><Badge variant="outline">Nouveau</Badge></Td>
              <Td><Badge>Moyenne</Badge></Td>
              <Td>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Modifier</Button>
                  <Button size="sm" variant="secondary">Supprimer</Button>
                </div>
              </Td>
            </Tr>
            <Tr>
              <Td>003</Td>
              <Td>Mise a jour Windows</Td>
              <Td><Badge variant="dark">Resolu</Badge></Td>
              <Td><Badge>Basse</Badge></Td>
              <Td>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">Modifier</Button>
                  <Button size="sm" variant="secondary">Supprimer</Button>
                </div>
              </Td>
            </Tr>
          </tbody>
        </Table>
      </section>

      <Divider />

      {/* Cards */}
      <section>
        <H2 className="mb-4">Cards</H2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card hoverable onClick={() => alert('Card cliquee')}>
            <Card.Body>
              <H3>Card Hoverable</H3>
              <P className="mt-2">Cliquez pour tester onClick.</P>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <H4>Avec Header</H4>
              <Badge variant="dark">Actif</Badge>
            </Card.Header>
            <Card.Body>
              <P>Contenu de la card avec header et footer.</P>
            </Card.Body>
            <Card.Footer>
              <Button size="sm" variant="outline">Annuler</Button>
              <Button size="sm">Valider</Button>
            </Card.Footer>
          </Card>

          <Card>
            <Card.Body className="text-center py-8">
              <H3 className="mt-2">Statistiques</H3>
              <P className="mt-1">12 tickets ouverts</P>
            </Card.Body>
          </Card>
        </div>
      </section>

      <Divider />

      {/* Alerts */}
      <section>
        <H2 className="mb-4">Alerts</H2>
        <div className="space-y-3">
          <Alert>Ceci est un message d'information.</Alert>
          <Alert>Operation realisee avec succes.</Alert>
          {alertVisible && (
            <Alert onClose={() => setAlertVisible(false)}>
              Alerte avec bouton fermer — cliquez x pour la masquer.
            </Alert>
          )}
        </div>
      </section>

      <Divider />

      {/* Modal */}
      <section>
        <H2 className="mb-4">Modal</H2>
        <Button onClick={() => setModalOpen(true)}>Ouvrir le modal</Button>

        <Modal title="Exemple de Modal" open={modalOpen} onClose={() => setModalOpen(false)}>
          <Modal.Body>
            <FormGroup label="Titre du ticket" required>
              <Input placeholder="Ex: Probleme reseau..." />
            </FormGroup>
            <FormGroup label="Description">
              <Textarea placeholder="Decrivez le probleme..." rows={3} />
            </FormGroup>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button onClick={() => { alert('Sauvegarde !'); setModalOpen(false); }}>Sauvegarder</Button>
          </Modal.Footer>
        </Modal>
      </section>

      <Divider />

      {/* Spinner */}
      <section>
        <H2 className="mb-4">Spinners</H2>
        <Card>
          <Card.Body>
            <div className="flex items-center gap-6">
              <div className="flex flex-col items-center gap-1">
                <Spinner size="sm" />
                <Text variant="xs">Small</Text>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Spinner size="lg" />
                <Text variant="xs">Large</Text>
              </div>
            </div>
            <Divider />
            <Spinner size="lg" label="Chargement des tickets en cours..." />
          </Card.Body>
        </Card>
      </section>

    </div>
  );
}
