import { useState, useMemo, useEffect } from 'react';
import { Table, Tr, Th, Td, Modal, Badge, Spinner, H2, Card } from '../../components/templates';
import { getAllCouts } from '../../services/coutService';
import { useTickets } from '../../hooks/useTicket';
import { fetchDataAPIRest } from '../../services/apiClient';

export default function ListCosts() {
  const { tickets, loading: loadingTickets } = useTickets();
  const [couts, setCouts] = useState([]);
  const [itemTickets, setItemTickets] = useState([]);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoadingExtra(true);
        const [coutsData, linksData] = await Promise.all([
          getAllCouts(),
          fetchAllRest('Item_Ticket')
        ]);
        setCouts(coutsData || []);
        setItemTickets(linksData || []);
      } catch (err) {
        console.error('Erreur chargement données:', err);
      } finally {
        setLoadingExtra(false);
      }
    }
    loadData();
  }, []);

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

  const getNormalizedCategory = (cat) => {
    if (!cat) return null;
    const lower = cat.toLowerCase();
    if (lower.includes('computer') || lower.includes('ordinateur')) return 'Computer';
    if (lower.includes('monitor') || lower.includes('moniteur')) return 'Monitor';
    if (lower.includes('phone') || lower.includes('telephone') || lower.includes('téléphone')) return 'Phone';
    return null;
  };

  const categories = ['Computer', 'Monitor', 'Phone'];
  const categoryLabels = {
    Computer: 'Ordinateur',
    Monitor: 'Moniteur',
    Phone: 'Téléphone'
  };

  const aggregated = useMemo(() => {
    const summary = {
      Computer: { supercost: 0, reouverture: 0, glpi: 0, details: [] },
      Monitor: { supercost: 0, reouverture: 0, glpi: 0, details: [] },
      Phone: { supercost: 0, reouverture: 0, glpi: 0, details: [] }
    };

    // 1. Agrégation des coûts SQLite
    couts.forEach(c => {
      const normCat = getNormalizedCategory(c.category);
      if (!normCat || !summary[normCat]) return;

      const val = parseFloat(c.cout) || 0;
      summary[normCat].details.push({
        idAuto: c.idAuto,
        idTicket: c.idTicket,
        idItem: c.idItem,
        typeCout: c.typeCout,
        cout: val,
        date: c.grp ? new Date(Number(c.grp)).toLocaleDateString() : '-'
      });

      if (c.typeCout === 'Supercout' || c.typeCout === 'annulation') {
        summary[normCat].supercost += val;
      } else if (c.typeCout === 'reouverture') {
        summary[normCat].reouverture += val;
      }
    });

    // 2. Agrégation des coûts GLPI
    tickets.forEach(ticket => {
      const rawFixedCost = (ticket.unrolledLines || []).reduce((lineSum, line) => {
        const fixed = parseFloat(String(line.cost_fixed || 0).replace(',', '.')) || 0;
        const rate  = parseFloat(String(line.cost_time  || 0).replace(',', '.')) || 0;
        const hours = (parseInt(line.actiontime || 0, 10)) / 3600;
        return lineSum + fixed + (rate * hours);
      }, 0);

      const ticketLinks = itemTickets.filter(link => String(link.tickets_id) === String(ticket.id));
      const linkCount = ticketLinks.length || 1;

      categories.forEach(cat => {
        const matchingLinks = ticketLinks.filter(link => link.itemtype === cat);
        const matchingLinksCount = matchingLinks.length;

        if (matchingLinksCount > 0) {
          const proratedCost = (rawFixedCost / linkCount) * matchingLinksCount;
          summary[cat].glpi += proratedCost;

          matchingLinks.forEach(link => {
            summary[cat].details.push({
              idAuto: null,
              idTicket: ticket.id,
              idItem: link.items_id,
              typeCout: 'glpi',
              cout: rawFixedCost / linkCount,
              date: ticket.date || '-'
            });
          });
        }
      });
    });

    return summary;
  }, [couts, tickets, itemTickets]);

  const totals = useMemo(() => {
    let supercost = 0;
    let reouverture = 0;
    let glpi = 0;

    Object.values(aggregated).forEach(cat => {
      supercost += cat.supercost;
      reouverture += cat.reouverture;
      glpi += cat.glpi;
    });

    return {
      supercost,
      reouverture,
      glpi,
      general: supercost + reouverture + glpi
    };
  }, [aggregated]);

  const loading = loadingTickets || loadingExtra;

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner size="lg" />
      </div>
    );
  }

  const selectedData = selectedCategory ? aggregated[selectedCategory] : null;

  return (
    <div className="space-y-6">
      <H2>Liste des Coûts par Catégorie</H2>

      <Card className="max-w-md">
        <Card.Header>
          <span className="font-semibold text-neutral-800">Résumé des Coûts Totaux</span>
        </Card.Header>
        <Card.Body className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Total Supercost:</span>
            <span className="font-semibold text-neutral-800">{totals.supercost.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Total Réouverture:</span>
            <span className="font-semibold text-neutral-800">{totals.reouverture.toFixed(2)} €</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-neutral-500">Total GLPI:</span>
            <span className="font-semibold text-neutral-800">{totals.glpi.toFixed(2)} €</span>
          </div>
          <div className="border-t border-neutral-100 my-2 pt-2 flex justify-between font-bold text-neutral-900">
            <span>Total Général:</span>
            <span>{totals.general.toFixed(2)} €</span>
          </div>
        </Card.Body>
      </Card>

      <Table>
        <thead>
          <Tr>
            <Th>Catégorie</Th>
            <Th>Supercost</Th>
            <Th>Réouverture</Th>
            <Th>Coût GLPI</Th>
            <Th>Total</Th>
          </Tr>
        </thead>
        <tbody>
          {categories.map(cat => {
            const data = aggregated[cat] || { supercost: 0, reouverture: 0, glpi: 0 };
            const totalRow = data.supercost + data.reouverture + data.glpi;
            return (
              <Tr 
                key={cat} 
                onClick={() => setSelectedCategory(cat)} 
                className="cursor-pointer"
              >
                <Td className="font-semibold text-blue-600 hover:underline">
                  {categoryLabels[cat]}
                </Td>
                <Td>{data.supercost.toFixed(2)} €</Td>
                <Td>{data.reouverture.toFixed(2)} €</Td>
                <Td>{data.glpi.toFixed(2)} €</Td>
                <Td className="font-semibold text-neutral-900">{totalRow.toFixed(2)} €</Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>

      <Modal
        open={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        title={`Détails : ${categoryLabels[selectedCategory] || ''}`}
        className="max-w-3xl"
      >
        <Modal.Body className="max-h-[70vh] overflow-y-auto">
          {selectedData && selectedData.details.length > 0 ? (
            <Table>
              <thead>
                <Tr>
                  <Th>Type</Th>
                  <Th>Ticket</Th>
                  <Th>Matériel ID</Th>
                  <Th>Date</Th>
                  <Th className="text-right">Montant</Th>
                </Tr>
              </thead>
              <tbody>
                {selectedData.details.map((item, idx) => {
                  let badgeVariant = 'outline';
                  if (item.typeCout === 'Supercout') badgeVariant = 'dark';
                  else if (item.typeCout === 'reouverture') badgeVariant = 'success';
                  else if (item.typeCout === 'annulation') badgeVariant = 'danger';
                  else if (item.typeCout === 'glpi') badgeVariant = 'warning';

                  return (
                    <Tr key={item.idAuto || idx}>
                      <Td>
                        <Badge variant={badgeVariant}>
                          {item.typeCout}
                        </Badge>
                      </Td>
                      <Td>Ticket #{item.idTicket}</Td>
                      <Td>{item.idItem || '-'}</Td>
                      <Td>{item.date}</Td>
                      <Td className="text-right font-semibold">
                        {parseFloat(item.cout).toFixed(2)} €
                      </Td>
                    </Tr>
                  );
                })}
              </tbody>
            </Table>
          ) : (
            <p className="text-neutral-500 italic py-4 text-center">
              Aucun détail disponible pour cette catégorie.
            </p>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
}
