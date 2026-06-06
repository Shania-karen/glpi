import { useState, useMemo, useEffect } from 'react';
import { useAssets } from '../../hooks/useAssets';
import { Table, Input, Select, Badge, Spinner, H2 } from '../../components/templates';
import { getElements } from '../../services/dashboard';
export default function AssetList() {
  const { assets, error } = useAssets();
  const [elements, setElements] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
   useEffect(() => {
          const loadData = async () => {
              try {
                  const data = await getElements();
                  setElements(data);
              
              } catch (error) {
                  console.error("Erreur lors de la récupération:", error);
              } finally {
                  setLoading(false);
              }
          };
  
          loadData();
      }, []); 

  const filteredElements = useMemo(() => {
  return elements.filter((asset) => {
    const name = (asset.name || '').toLowerCase();
    const itemType = asset._itemtype || asset.itemtype || 'Computer';

    const matchesSearch =
      !searchTerm ||
      name.includes(searchTerm.toLowerCase()) ||
      String(asset.id || asset.items_id || '').includes(searchTerm);

    const matchesType = !typeFilter || itemType === typeFilter;

    return matchesSearch && matchesType;
  });
}, [elements, searchTerm, typeFilter]);    
  const uniqueTypes = useMemo(() => {
    const types = new Set(assets.map(a => a._itemtype || a.itemtype || 'Computer'));
    return Array.from(types).sort();
  }, [assets]);

  if (loading) return <div className="p-10 flex justify-center"><Spinner label="Chargement de vos éléments..." /></div>;
  if (error) return <div className="p-10 text-red-500">Erreur : {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <H2>Liste des Éléments</H2>
          <p className="text-neutral-500 text-sm mt-1">Gérez votre parc informatique et vos équipements associés.</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input 
            type="text" 
            placeholder="Rechercher par nom ou identifiant..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Tous les types</option>
            {uniqueTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </Select>
        </div>
      </div>
      <Table striped>
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            <th className="px-4 py-3 font-semibold text-neutral-600">ID</th>
            <th className="px-4 py-3 font-semibold text-neutral-600">Nom de l'élément</th>
            <th className="px-4 py-3 font-semibold text-neutral-600">Type</th>
            <th className="px-4 py-3 font-semibold text-neutral-600">nombre d'éléments</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-200">
            {filteredElements.length > 0 ? (
              filteredElements.map((asset, idx) => {
              const itemId = asset.id || asset.items_id;
              const itemType = asset._itemtype || asset.itemtype || 'Computer';
              return (
                <tr key={`${itemType}-${itemId || idx}`} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3 text-neutral-500">{idx+1}</td>
                  <td className="px-4 py-3 font-medium text-black">{asset.name || 'Sans nom'}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline">{itemType}</Badge>
                  </td>
                  <td className="px-4 py-3">
                      {asset.allItems?.length || 0}
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan="4" className="px-4 py-8 text-center text-neutral-500 italic">
                Aucun élément ne correspond à votre recherche.
              </td>
            </tr>
          )}
        </tbody>
      </Table>
    </div>
  );
}
