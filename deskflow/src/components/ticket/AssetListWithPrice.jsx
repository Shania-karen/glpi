import { useState, useMemo, useEffect } from 'react';
import { Card, Spinner, H2, Badge, Select } from '../templates';
import { useTickets } from '../../hooks/useTicket';
import { fetchDataAPIRest } from '../../services/apiClient';
import { getAllCouts } from '../../services/coutService';
import { getElements } from '../../services/dashboard';

const itemtypeLabels = {
  Computer: 'Ordinateur',
  Monitor: 'Moniteur',
  Phone: 'Téléphone',
  Printer: 'Imprimante',
  Software: 'Logiciel',
  NetworkEquipment: 'Équipement Réseau',
  Peripheral: 'Périphérique'
};

export default function AssetListWithPrice() {
  const { tickets, loading: loadingTickets } = useTickets();
  const [couts, setCouts] = useState([]);
  const [itemTickets, setItemTickets] = useState([]);
  const [elements, setElements] = useState([]);
  const [loadingExtra, setLoadingExtra] = useState(true);

  // Filtres
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedElementId, setSelectedElementId] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState('');

  const fetchAllRest = async (resource) => {
    const limit = 500;
    let start = 0;
    let all = [];
    const separator = resource.includes('?') ? '&' : '?';
    try {
      while (true) {
        const url = `${resource}${separator}range=${start}-${start + limit - 1}`;
        const data = await fetchDataAPIRest(url);
        if (!data || !Array.isArray(data) || data.length === 0) break;
        all = all.concat(data);
        if (data.length < limit) break;
        start += limit;
      }
      return all;
    } catch (err) {
      console.warn(`warning fetching REST ${resource}:`, err);
      return [];
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoadingExtra(true);
      try {
        const [coutsData, linksData, elementsData] = await Promise.all([
          getAllCouts(),
          fetchAllRest('Item_Ticket'),
          getElements()
        ]);
        setCouts(coutsData);
        setItemTickets(linksData);
        setElements(elementsData || []);
      } catch (err) {
        console.error('Erreur chargement données:', err);
      } finally {
        setLoadingExtra(false);
      }
    }
    loadData();
  }, []);

  const allItems = useMemo(() => {
    return elements.flatMap((group) =>
      (group.allItems || []).map((item) => ({
        ...item,
        _itemtype: group.itemtype || group.itemName || 'Computer',
      }))
    );
  }, [elements]);

  const uniqueCategories = useMemo(() => {
    const cats = new Set(allItems.map(item => item._itemtype));
    return Array.from(cats).sort();
  }, [allItems]);

  const selectableElements = useMemo(() => {
    if (!selectedCategory) return allItems;
    return allItems.filter(item => item._itemtype === selectedCategory);
  }, [allItems, selectedCategory]);

  const uniqueTickets = useMemo(() => {
    return (tickets || [])
      .map(t => {
        const title = t.name || t.content || '';
        const cleanTitle = title.length > 50 ? title.substring(0, 50) + '...' : title;
        return {
          id: String(t.id),
          name: `Ticket #${t.id}${cleanTitle ? ` - ${cleanTitle}` : ''}`
        };
      })
      .sort((a, b) => parseInt(b.id) - parseInt(a.id));
  }, [tickets]);

  const processedCouts = useMemo(() => {
    return couts.map(c => {
      const ticket = tickets.find(t => String(t.id) === String(c.idTicket));
      
      const rawFixedCost = (ticket?.unrolledLines || []).reduce((sum, line) => {
        const fixed = parseFloat(String(line.cost_fixed || 0).replace(',', '.')) || 0;
        const rate  = parseFloat(String(line.cost_time  || 0).replace(',', '.')) || 0;
        const hours = (parseInt(line.actiontime || 0, 10)) / 3600;
        return sum + fixed + (rate * hours);
      }, 0);

      const ticketLinks = itemTickets.filter(link => String(link.tickets_id) === String(c.idTicket));
      const linkCount = ticketLinks.length || 1;
      const glpiCost = rawFixedCost / linkCount;
      const rowTotal = glpiCost + (c.cout || 0);

      // Chercher les détails du matériel spécifique s'il existe
      let targetItem = null;
      if (c.idItem && c.category) {
        targetItem = allItems.find(
          item => String(item.id) === String(c.idItem) && item._itemtype === c.category
        );
      }

      // Chercher les détails de tous les matériels liés au ticket
      const linkedItemsDetails = ticketLinks.map(link => {
        return allItems.find(
          item => String(item.id) === String(link.items_id) && item._itemtype === link.itemtype
        ) || { id: link.items_id, _itemtype: link.itemtype, name: `${link.itemtype} #${link.items_id}` };
      });

      return {
        ...c,
        glpiCost,
        rowTotal,
        targetItem,
        linkedItemsDetails
      };
    });
  }, [couts, tickets, itemTickets, allItems]);

  const filteredCouts = useMemo(() => {
    return processedCouts.filter(c => {
      // 1. Filtre par catégorie
      if (selectedCategory) {
        const matchesDirect = c.category === selectedCategory;
        const matchesTicketLink = !c.category && itemTickets.some(
          link => String(link.tickets_id) === String(c.idTicket) && link.itemtype === selectedCategory
        );
        if (!matchesDirect && !matchesTicketLink) return false;
      }

      // 2. Filtre par équipement spécifique
      if (selectedElementId) {
        const [itemtype, itemId] = selectedElementId.split('_');
        const matchesDirect = c.category === itemtype && String(c.idItem) === String(itemId);
        const matchesTicketLink = (!c.idItem) && itemTickets.some(
          link => String(link.tickets_id) === String(c.idTicket) && link.itemtype === itemtype && String(link.items_id) === String(itemId)
        );
        if (!matchesDirect && !matchesTicketLink) return false;
      }

      // 3. Filtre par ticket
      if (selectedTicketId) {
        if (String(c.idTicket) !== String(selectedTicketId)) return false;
      }

      return true;
    });
  }, [processedCouts, selectedCategory, selectedElementId, selectedTicketId, itemTickets]);

  const stats = useMemo(() => {
    let glpiTotal = 0;

    tickets.forEach(ticket => {
      const rawFixedCost = (ticket.unrolledLines || []).reduce((lineSum, line) => {
        const fixed = parseFloat(String(line.cost_fixed || 0).replace(',', '.')) || 0;
        const rate  = parseFloat(String(line.cost_time  || 0).replace(',', '.')) || 0;
        const hours = (parseInt(line.actiontime || 0, 10)) / 3600;
        return lineSum + fixed + (rate * hours);
      }, 0);

      const ticketLinks = itemTickets.filter(link => String(link.tickets_id) === String(ticket.id));
      const linkCount = ticketLinks.length || 1;

      if (selectedTicketId && String(ticket.id) !== String(selectedTicketId)) {
        return;
      }

      if (!selectedCategory && !selectedElementId) {
        glpiTotal += rawFixedCost;
      } else if (selectedElementId) {
        const [itemtype, itemId] = selectedElementId.split('_');
        const isLinked = ticketLinks.some(
          link => link.itemtype === itemtype && String(link.items_id) === String(itemId)
        );
        if (isLinked) {
          glpiTotal += rawFixedCost / linkCount;
        }
      } else if (selectedCategory) {
        const matchingLinksCount = ticketLinks.filter(link => link.itemtype === selectedCategory).length;
        if (matchingLinksCount > 0) {
          glpiTotal += (rawFixedCost / linkCount) * matchingLinksCount;
        }
      }
    });

    let superTotal = 0;
    let ouvertureTotal = 0;
    let annulationTotal = 0;

    filteredCouts.forEach(c => {
      const val = parseFloat(c.cout) || 0;
      if (c.typeCout === 'Supercout') {
        superTotal += val;
      } else if (c.typeCout === 'reouverture') {
        ouvertureTotal += val;
      } else if (c.typeCout === 'annulation') {
        annulationTotal += val; 
      }
    });

    return {
      glpiTotal,
      superTotal: superTotal + annulationTotal, // Déduction des annulations (valeurs négatives)
      ouvertureTotal,
      annulationTotal,
      grandTotal: glpiTotal + (superTotal + annulationTotal) + ouvertureTotal,
    };
  }, [filteredCouts, tickets, itemTickets, selectedCategory, selectedElementId, selectedTicketId]);

  const loading = loadingTickets || loadingExtra;

  if (loading) {
    return (
      <div className="p-10 flex flex-col items-center justify-center min-h-[400px]">
        <Spinner size="lg" />
        <p className="text-neutral-500 text-sm mt-4">Chargement et liaison des coûts en cours...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-neutral-50 min-h-screen space-y-6">
      <div>
        <H2>Liste & Récapitulatif des Coûts SQLite</H2>
        <p className="text-neutral-500 text-sm mt-1">
          Visualisation simplifiée de la table unifiée <code>couts</code> liée aux coûts GLPI proratisés.
        </p>
      </div>

      {/* Barre de filtrage par élément */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            Filtrer par Ticket
          </label>
          <Select value={selectedTicketId} onChange={(e) => setSelectedTicketId(e.target.value)}>
            <option value="">Tous les tickets</option>
            {uniqueTickets.map(t => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            Filtrer par Catégorie d'Élément
          </label>
          <Select value={selectedCategory} onChange={(e) => {
            setSelectedCategory(e.target.value);
            setSelectedElementId(''); // Réinitialiser le filtre spécifique lors du changement de catégorie
          }}>
            <option value="">Toutes les catégories</option>
            {uniqueCategories.map(cat => (
              <option key={cat} value={cat}>
                {itemtypeLabels[cat] || cat}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex-1">
          <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
            Filtrer par Élément Spécifique (Asset)
          </label>
          <Select value={selectedElementId} onChange={(e) => setSelectedElementId(e.target.value)}>
            <option value="">Tous les éléments spécifiques</option>
            {selectableElements.map(item => (
              <option key={`${item._itemtype}_${item.id}`} value={`${item._itemtype}_${item.id}`}>
                {`[${itemtypeLabels[item._itemtype] || item._itemtype}] ${item.name || 'Sans nom'} (ID: ${item.id})`}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4 border-neutral-200 bg-white">
          <span className="text-xs text-neutral-500 font-bold uppercase tracking-wider">Total Coûts GLPI</span>
          <p className="text-xl font-bold text-neutral-800 mt-1">{(stats.glpiTotal).toFixed(2)} €</p>
        </Card>

        <Card className="p-4 border-neutral-200 bg-white">
          <span className="text-xs text-blue-500 font-bold uppercase tracking-wider">Total Super Coûts</span>
          <p className="text-xl font-bold text-blue-600 mt-1">{(stats.superTotal).toFixed(2)} €</p>
        </Card>

        <Card className="p-4 border-neutral-200 bg-white">
          <span className="text-xs text-purple-500 font-bold uppercase tracking-wider">Total Réouvertures</span>
          <p className="text-xl font-bold text-purple-600 mt-1">{(stats.ouvertureTotal).toFixed(2)} €</p>
        </Card>

        <Card className="p-4 border-neutral-200 bg-white">
          <span className="text-xs text-red-500 font-bold uppercase tracking-wider">Total Annulations</span>
          <p className="text-xl font-bold text-red-600 mt-1">{(stats.annulationTotal).toFixed(2)} €</p>
        </Card>

        <div className="p-4 rounded-xl shadow-sm bg-neutral-900 border border-neutral-800 text-white">
          <span className="text-xs text-neutral-400 font-bold uppercase tracking-wider">Coût Global Consolidé</span>
          <p className="text-xl font-bold text-white mt-1">{(stats.grandTotal).toFixed(2)} €</p>
          <p className="text-[9px] text-neutral-500 mt-0.5">GLPI + Super + Réouv + Annulations</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden shadow-sm">
        {filteredCouts.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                <th className="px-6 py-4">ID Ticket</th>
                <th className="px-6 py-4">Élément</th>
                <th className="px-6 py-4">Catégorie Coût</th>
                <th className="px-6 py-4">Type Coût</th>
                <th className="px-6 py-4 text-right">Coût GLPI</th>
                <th className="px-6 py-4 text-right">Coût SQLite</th>
                <th className="px-6 py-4 text-right bg-neutral-50 font-bold text-neutral-800">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 text-sm text-neutral-700">
              {filteredCouts.map((c) => {
                let badgeVariant = 'outline';
                let textClass = 'text-neutral-900';

                if (c.typeCout === 'Supercout') {
                  badgeVariant = 'primary';
                  textClass = 'text-blue-600 font-semibold';
                } else if (c.typeCout === 'reouverture') {
                  badgeVariant = 'secondary';
                  textClass = 'text-purple-600 font-semibold';
                } else if (c.typeCout === 'annulation') {
                  badgeVariant = 'danger';
                  textClass = 'text-red-600 font-semibold';
                }

                return (
                  <tr key={c.idAuto} className="hover:bg-neutral-50/30 transition-colors">
                    <td className="px-6 py-4 font-medium">Ticket #{c.idTicket}</td>
                    
                    <td className="px-6 py-4">
                      {c.targetItem ? (
                        <div className="flex flex-col">
                          <span className="font-semibold text-neutral-800">{c.targetItem.name || 'Sans nom'}</span>
                          <span className="text-[10px] text-neutral-500 font-mono">
                            ID: {c.idItem}
                          </span>
                        </div>
                      ) : c.linkedItemsDetails.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {c.linkedItemsDetails.map((item, idx) => (
                            <span key={idx} className="text-xs text-neutral-600">
                              {item.name || 'Sans nom'}{' '}
                              <span className="text-[10px] text-neutral-400 font-mono">
                                (ID: {item.id})
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic text-xs">Aucun élément lié</span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      {c.category ? (
                        <Badge variant="outline" className="uppercase text-[10px] font-semibold">
                          {itemtypeLabels[c.category] || c.category}
                        </Badge>
                      ) : (
                        <span className="text-neutral-400 italic text-xs">Non spécifié</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={badgeVariant} className="capitalize text-[10px] font-semibold">
                        {c.typeCout}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-neutral-600">
                      {(c.glpiCost || 0).toFixed(2)} €
                    </td>
                    <td className={`px-6 py-4 text-right ${textClass}`}>
                      {(c.cout || 0).toFixed(2)} €
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-neutral-900 bg-neutral-50/20">
                      {(c.rowTotal || 0).toFixed(2)} €
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-neutral-400 italic">
            Aucun enregistrement de coût ne correspond aux critères de filtrage.
          </div>
        )}
      </div>
    </div>
  );
}
