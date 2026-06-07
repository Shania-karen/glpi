import { useState, useMemo, useEffect } from 'react';
import { Table, Input, Select, Badge, Spinner, H2 } from '../../components/templates';
import { getElements } from '../../services/dashboard';

export default function AssetList() {
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getElements();
        setGroups(data);
      } catch (error) {
        console.error('Erreur lors de la récupération:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Aplatir tous les items individuels depuis chaque groupe
  const allItems = useMemo(() => {
    return groups.flatMap((group) =>
      (group.allItems || []).map((item) => ({
        ...item,
        _itemtype: group.itemtype || group.itemName || 'Computer',
      }))
    );
  }, [groups]);

  // Types uniques pour le filtre
  const uniqueTypes = useMemo(() => {
    const types = new Set(allItems.map((item) => item._itemtype));
    return Array.from(types).sort();
  }, [allItems]);

  // Filtrage multi-critère : nom, ID, type
  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return allItems.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const id = String(item.id || '');
      const serial = (item.serial || '').toLowerCase();
      const otherserial = (item.otherserial || '').toLowerCase();

      const matchesSearch =
        !term ||
        name.includes(term) ||
        id.includes(term) ||
        serial.includes(term) ||
        otherserial.includes(term);

      const matchesType = !typeFilter || item._itemtype === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [allItems, searchTerm, typeFilter]);

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Spinner label="Chargement de vos éléments..." />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <H2>Liste des Éléments</H2>
          <p className="text-neutral-500 text-sm mt-1">
            {allItems.length} équipement(s) au total — recherche par nom, ID, numéro de série ou type.
          </p>
        </div>
        <Badge variant="outline">{filteredItems.length} résultat(s)</Badge>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Rechercher par nom, ID, numéro de série…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Tous les types</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Tableau */}
      <Table striped>
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th className="px-4 py-3 font-semibold text-neutral-600 text-left">ID GLPI</th>
            <th className="px-4 py-3 font-semibold text-neutral-600 text-left">Nom de l'équipement</th>
            <th className="px-4 py-3 font-semibold text-neutral-600 text-left">Type</th>
            <th className="px-4 py-3 font-semibold text-neutral-600 text-left">N° de série</th>
            <th className="px-4 py-3 font-semibold text-neutral-600 text-left">Statut</th>
            <th className="px-4 py-3 font-semibold text-neutral-600 text-left">Localisation</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, idx) => (
              <tr
                key={`${item._itemtype}-${item.id ?? idx}`}
                className="hover:bg-neutral-50 transition-colors"
              >
                <td className="px-4 py-3 text-neutral-400 text-sm">{item.id ?? '—'}</td>
                <td className="px-4 py-3 font-medium text-black">{item.name || 'Sans nom'}</td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{item._itemtype}</Badge>
                </td>
                <td className="px-4 py-3 text-neutral-500 text-sm font-mono">
                  {item.serial || item.otherserial || '—'}
                </td>
                <td className="px-4 py-3">
                  {item.states_id?.name || item.status?.name || item.states_id
                    ? <Badge variant="info">{item.states_id?.name || item.status?.name || item.states_id}</Badge>
                    : <span className="text-neutral-400">—</span>
                  }
                </td>
                <td className="px-4 py-3 text-neutral-500 text-sm">
                  {item.locations_id?.name || item.location?.name || item.locations_id || '—'}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="px-4 py-10 text-center text-neutral-400 italic">
                Aucun équipement ne correspond à votre recherche.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
