import { useState, useEffect } from 'react';
import { Table, Tr, Th, Td, Modal, Badge, Spinner, H2, Card, Button, Input, Select, Label, FormGroup } from '../../components/templates';
import { getAllCouts, updateCoutGroup , deleteCoutGroup} from '../../services/coutService';
import { fetchDataAPIRest } from '../../services/apiClient';

export default function ManageCosts() {
  const [couts, setCouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editGroup, setEditGroup] = useState(null);
  const [editMode, setEditMode] = useState(1);
  const [editValeur, setEditValeur] = useState(0);
  const [editCout, setEditCout] = useState(0);


  async function loadData() {
    try {
      setLoading(true);
      const data = await getAllCouts();
      setCouts(data || []);
    } catch (err) {
      console.error('Erreur chargement coûts:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredCouts = couts.filter(c => c.typeCout === 'reouverture' || c.typeCout === 'Supercout');
  const cancelledCouts = couts.filter(c => c.typeCout === 'annulation' );

  const groupsMap = {};
  filteredCouts.forEach(c => {
    const grp = c.grp;
    if (!groupsMap[grp]) {
      groupsMap[grp] = {
        grp: grp,
        idTicket: c.idTicket,
        typeCout: c.typeCout,
        mode: c.mode,
        valeur: c.valeur,
        cout: 0,
        rows: []
      };
    }
    groupsMap[grp].cout += c.cout;
    groupsMap[grp].rows.push(c);
  });
    const groupsList = Object.values(groupsMap).sort((a, b) => b.grp - a.grp);


   const cancelMap = {};
  cancelledCouts.forEach(c => {
    const grp = c.grp;
    if (!cancelMap[grp]) {
      cancelMap[grp] = {
        grp: grp,
        idTicket: c.idTicket,
        typeCout: c.typeCout,
        cout: 0,
        rows: []
      };
    }
    cancelMap[grp].cout += c.cout;
    cancelMap[grp].rows.push(c);
  });

  const cancelList = Object.values(cancelMap).sort((a, b) => b.grp - a.grp);

  const handleOpenEdit = (group) => {
    setEditGroup(group);
    setEditMode(group.mode || 1);
    setEditValeur(group.valeur || 0);
    setEditCout(group.cout || 0);
  };

  const handleRestaure = async( group ) =>{
    try {
        await deleteCoutGroup(group.grp);

        await fetchDataAPIRest(`Ticket/${group.idTicket}`,{
            method : 'PUT',
            body: { input: { id: group.idTicket, status: 6 } },
        });
        await loadData();
    } catch (error) {
        alert('Erreyr' +error.message);
    }
  };

  const handleSave = async () => {
    if (!editGroup) return;
    try {
      await updateCoutGroup(editGroup.grp, {
        typeCout: editGroup.typeCout,
        cout: editCout,
        mode: editMode,
        valeur: editValeur
      });
      setEditGroup(null);
      await loadData();
    } catch (err) {
      console.error('Erreur lors de la modification:', err);
      alert('Erreur lors de la modification : ' + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <H2>Gestion des Coûts (Réouvertures & Supercosts)</H2>

      <Table>
        <thead>
          <Tr>
            <Th>Ticket</Th>
            <Th>Type</Th>
            <Th>Mode</Th>
            <Th>Valeur (%)</Th>
            <Th>Montant Total</Th>
            <Th>Date</Th>
            <Th>Actions</Th>
          </Tr>
        </thead>
        <tbody>
          {groupsList.map(group => {
            let badgeVariant = 'outline';
            if (group.typeCout === 'Supercout') badgeVariant = 'dark';
            else if (group.typeCout === 'reouverture') badgeVariant = 'success';

            return (
              <Tr key={group.grp}>
                <Td>Ticket #{group.idTicket}</Td>
                <Td>
                  <Badge variant={badgeVariant}>
                    {group.typeCout}
                  </Badge>
                </Td>
                <Td>{group.typeCout === 'reouverture' ? `Mode ${group.mode || 1}` : '-'}</Td>
                <Td>{group.typeCout === 'reouverture' ? `${group.valeur || 0}%` : '-'}</Td>
                <Td className="font-semibold">{group.cout.toFixed(2)} €</Td>
                <Td>{new Date(group.grp).toLocaleString()}</Td>
                <Td>
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(group)}>
                    Modifier
                  </Button>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
     <H2>Liste des annulées</H2>

            <Table>
        <thead>
          <Tr>
            <Th>Ticket</Th>
            <Th>Type</Th>
            <Th>Montant annulé</Th>
            <Th>Date</Th>
            <Th>Actions</Th>
          </Tr>
        </thead>
        <tbody>
          {cancelList.map(group => {
            let badgeVariant = 'outline';
            if (group.typeCout === 'Supercout') badgeVariant = 'dark';
            else if (group.typeCout === 'reouverture') badgeVariant = 'success';

            return (
              <Tr key={group.grp}>
                <Td>Ticket #{group.idTicket}</Td>
                <Td>
                  <Badge variant={badgeVariant}>
                    {group.typeCout}
                  </Badge>
                </Td>
                <Td className="font-semibold">{group.cout.toFixed(2)} €</Td>
                <Td>{new Date(group.grp).toLocaleString()}</Td>
                <Td>
                  <Button variant="outline" size="sm" onClick={() => handleRestaure(group)}>
                    Restaurer
                  </Button>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>

      <Modal
        open={!!editGroup}
        onClose={() => setEditGroup(null)}
        title={`Modifier : ${editGroup?.typeCout} (Ticket #${editGroup?.idTicket})`}
      >
        <Modal.Body className="space-y-4">
          {editGroup?.typeCout === 'reouverture' ? (
            <>
              <FormGroup>
                <Label>Mode de calcul</Label>
                <Select value={editMode} onChange={e => setEditMode(Number(e.target.value))}>
                  <option value={1}>Mode 1 (Dernier Supercost)</option>
                  <option value={2}>Mode 2 (Premier Supercost)</option>
                  <option value={3}>Mode 3 (Moyenne des Supercosts)</option>
                  <option value={4}>Mode 4 (Somme des Supercosts)</option>
                </Select>
              </FormGroup>
              <FormGroup>
                <Label>Pourcentage (%)</Label>
                <Input
                  type="number"
                  value={editValeur}
                  onChange={e => setEditValeur(Number(e.target.value))}
                />
              </FormGroup>
                 
              
            </>
          ) : (
            <FormGroup>
              <Label>Coût total (€)</Label>
              <Input
                type="number"
                value={editCout}
                onChange={e => setEditCout(Number(e.target.value))}
              />
            </FormGroup>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditGroup(null)}>
            Annuler
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Valider
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}