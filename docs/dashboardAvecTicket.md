import { useEffect, useState, useMemo } from 'react';
import { getElements } from '../../services/dashboard';
import { fetchDataAPIRest, fetchGlpiData } from '../../services/apiClient';
import Detail from './Detail';
import { useLanguage } from '../../context/LanguageContext';
const formatNumber = (num) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num;
};

const MinimalTile = ({ title, count, iconColorClass, svgIcon, onClick }) => (
<div 
    onClick={onClick}
    className="bg-white border border-gray-100 p-5 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
>
    <div className="flex justify-between items-start">
        <div className="text-4xl font-light text-gray-800">{formatNumber(count)}</div>
        <div className={`p-2 rounded-lg ${iconColorClass} transition-colors opacity-80 group-hover:opacity-100`}>
            {svgIcon}
        </div>
    </div>
    <div className="mt-4 text-sm font-semibold text-gray-500 tracking-wide">{title}</div>
</div>
);

const DefaultIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
);

export default function Dashboard() {
const [elements, setElements] = useState([]);
const [loading, setLoading] = useState(true);
const [isModalOpen, setIsModalOpen] = useState(false);
const [selectedElement, setSelectedElement] = useState(null);
const [tickets, setTickets] = useState([]);
const { lang, t } = useLanguage();
const [dbColors, setDbColors] = useState({});

useEffect(() => {
    async function fetchColors() {
        try {
            const res = await fetch('http://localhost:8081/api/colors');
            if (res.ok) {
                const data = await res.json();
                const colorsMap = {};
                data.forEach(item => {
                    colorsMap[item.status] = {
                        color: item.color,
                        translation: item.translation
                    };
                });
                setDbColors(colorsMap);
            }
        } catch (err) {
            console.error('Failed to fetch colors from SQLite:', err);
        }
    }
    fetchColors();
}, []);

const [ticketTypeFilter, setTicketTypeFilter] = useState('all'); 
const [ticketStatusFilter, setTicketStatusFilter] = useState('all');
const [elementCategoryFilter, setElementCategoryFilter] = useState('all');

const getTicketStatusCode = (ticket) => {
    const rawStatus = ticket.status !== undefined ? ticket.status : ticket.statut;
    if (!rawStatus) return null;

    let statusToTest = rawStatus;
    if (typeof rawStatus === 'object') {
        statusToTest = rawStatus.id !== undefined ? rawStatus.id : (rawStatus.name || rawStatus.value);
    }

    const statusStr = String(statusToTest).toLowerCase();

    if (statusStr === '1' || statusStr.includes('nouveau') || statusStr === 'new') return 1;
    if (statusStr === '3' || statusStr.includes('planifi')) return 3;
    if (statusStr === '4' || statusStr.includes('attente') || statusStr === 'pending') return 4;
    if (statusStr === '2' || statusStr.includes('assign') || statusStr.includes('cours')) return 2;
    if (statusStr === '5' || statusStr.includes('résolu') || statusStr.includes('resolu') || statusStr === 'solved') return 5;
    if (statusStr === '6' || statusStr.includes('ferm') || statusStr.includes('clos') || statusStr === 'closed') return 6;

    return null;
};

useEffect(() => {
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

    const loadData = async () => {
        try {
            const [dataElements, dataTickets, dataTasks, dataCosts] = await Promise.all([
                getElements(),
                fetchAllRest('Ticket?expand_dropdowns=true'),
                fetchAllRest('TicketTask'),
                fetchAllRest('TicketCost')
            ]);
            
            setElements(dataElements);
            
            const rawTasks = Array.isArray(dataTasks) ? dataTasks : (dataTasks?.data || []);
            const rawCosts = Array.isArray(dataCosts) ? dataCosts : (dataCosts?.data || []);
            console.log('rawCosts pour ticket 130:', rawCosts
                .filter(c => String(c.tickets_id?.id || c.tickets_id) === '130')
                .map(c => ({ 
                    id: c.id, 
                    cost_fixed: c.cost_fixed, 
                    cost_time: c.cost_time,
                    actiontime: c.actiontime 
                }))
            );
            const rawTickets = Array.isArray(dataTickets) ? dataTickets : (dataTickets?.data || []);

            const activeTickets = rawTickets
                .filter(ticket => ticket.is_deleted !== true)
                .map(ticket => {
                    const associatedCosts = rawCosts
                        .filter(cost => String(cost.tickets_id?.id || cost.tickets_id) === String(ticket.id))
                        .sort((a, b) => a.id - b.id);
                    
                    const associatedTasks = rawTasks
                        .filter(task => String(task.tickets_id?.id || task.tickets_id) === String(ticket.id))
                        .sort((a, b) => a.id - b.id);

                    const availableTasks = [...associatedTasks];
                    const unrolledLines = [];

                    if (associatedCosts.length === 0 && availableTasks.length === 0) {
                        unrolledLines.push({ ...ticket, actiontime: 0, cost_fixed: 0, cost_time: 0 });
                    } else {
                        // On parcourt les coûts et on cherche la tâche correspondante (Smart Match)
                        associatedCosts.forEach(cost => {
                            console.log('avant match:', availableTasks.length, 'tâches restantes');
                            const costTimeVal = parseFloat(String(cost.cost_time?.value || cost.cost_time || 0).replace(',', '.'));
                            const costFixedVal = parseFloat(String(cost.cost_fixed?.value || cost.cost_fixed || 0).replace(',', '.'));
                            
                            let matchedTask = null;
                            
                            // Si ce coût possède un tarif horaire, il DOIT être lié à la tâche qui a une durée > 0
                            if (costTimeVal > 0) {
                                const taskIdx = availableTasks.findIndex(t => parseInt(t.actiontime?.value || t.actiontime || 0, 10) > 0);
                                if (taskIdx !== -1) matchedTask = availableTasks.splice(taskIdx, 1)[0];
                            } else {
                                // Sinon on cherche une tâche à 0 (si GLPI l'a gardée)
                                const taskIdx = availableTasks.findIndex(t => parseInt(t.actiontime?.value || t.actiontime || 0, 10) === 0);
                                if (taskIdx !== -1) matchedTask = availableTasks.splice(taskIdx, 1)[0];
                            }

                            if (!matchedTask && availableTasks.length > 0) {
                                matchedTask = availableTasks.shift();
                            }

                            unrolledLines.push({
                                ...ticket,
                                actiontime: matchedTask ? parseInt(matchedTask.actiontime?.value || matchedTask.actiontime || 0, 10) : 0,
                                cost_fixed: costFixedVal,
                                cost_time: costTimeVal
                            });
                            console.log('matchedTask:', matchedTask?.id, '| restantes après:', availableTasks.length);
                        });

                        // S'il reste des tâches sans coût
                        availableTasks.forEach(task => {
                             console.log('⚠️ tâche orpheline ajoutée:', task.id, 'pour ticket:', ticket.id);
                            unrolledLines.push({
                                ...ticket,
                                actiontime: parseInt(task.actiontime?.value || task.actiontime || 0, 10),
                                cost_fixed: 0,
                                cost_time: 0
                            });
                        });
                    }

                    // On retourne le ticket unique, en lui attachant ses lignes déroulées pour le Modal
                    return {
                        ...ticket,
                        unrolledLines
                    };
                });
                activeTickets.forEach(t => {
                    if (t.unrolledLines.length > 1) {
                        console.log(`Ticket #${t.id} → ${t.unrolledLines.length} lignes`, t.unrolledLines);
                    }
                });

            setTickets(activeTickets); // tickets contient des tickets UNIQUES

        } catch (error) {
            console.error("Erreur lors de la récupération des données:", error);
        } finally {
            setLoading(false);
        }
    };
    loadData();
}, []);

const totalElements = useMemo(() => elements.reduce((acc, el) => acc + (el.allItems?.length || 0), 0), [elements]);

const filteredTickets = useMemo(() => {
    let result = tickets;

    if (ticketTypeFilter !== 'all') {
        result = result.filter(t => {
            const typeStr = String(t.type).toLowerCase();
            if (ticketTypeFilter === '1') return typeStr === '1' || typeStr.includes('incident');
            if (ticketTypeFilter === '2') return typeStr === '2' || typeStr.includes('demande');
            return true;
        });
    }

    if (ticketStatusFilter !== 'all') {
        result = result.filter(t => {
            const statusCode = getTicketStatusCode(t);
            return String(statusCode) === ticketStatusFilter;
        });
    }

    return result;
}, [tickets, ticketTypeFilter, ticketStatusFilter]);

const totalTickets = filteredTickets.length; // Maintenant le vrai total est correct !

const totalFixedCost = useMemo(() => {
    return filteredTickets.reduce((acc, t) => {
        const linesCost = t.unrolledLines?.reduce((sum, line) => sum + (line.cost_fixed || 0), 0) || 0;
        return acc + linesCost;
    }, 0);
}, [filteredTickets]);

const totalTimeCost = useMemo(() => {
    return filteredTickets.reduce((acc, t) => {
        const linesCost = t.unrolledLines?.reduce((sum, line) => sum + (line.cost_time || 0), 0) || 0;
        return acc + linesCost;
    }, 0);
}, [filteredTickets]);

const ticketStats = useMemo(() => {
    const stats = { nouveaux: 0, enAttente: 0, assignes: 0, planifies: 0, resolus: 0, fermes: 0 };      
    filteredTickets.forEach(ticket => {
        const statusCode = getTicketStatusCode(ticket);
        if (statusCode === 1) stats.nouveaux++;
        else if (statusCode === 2) stats.assignes++;
        else if (statusCode === 3) stats.planifies++;
        else if (statusCode === 4) stats.enAttente++;
        else if (statusCode === 5) stats.resolus++;
        else if (statusCode === 6) stats.fermes++;
    });
    return stats;
}, [filteredTickets]);

const filteredElements = useMemo(() => {
    if (elementCategoryFilter === 'all') return elements;
    return elements.filter(e => e.itemName === elementCategoryFilter);
}, [elements, elementCategoryFilter]);

const openModalForDetails = (element) => {
    setSelectedElement(element);
    setIsModalOpen(true);
};

// Fonction pour extraire les lignes déroulées uniquement pour le Detail.jsx
const getUnrolledTickets = (ticketList) => {
    return ticketList.flatMap(t => t.unrolledLines || []);
};

if (loading) {
    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
    );
}

return (
    <div className="p-6 md:p-10 bg-[#F8FAFC] min-h-screen font-sans text-gray-800">
        <div className="mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Vue d'ensemble</h1>
                <p className="text-gray-500 mt-1">Gérez votre centre d'assistance et votre parc informatique</p>
            </div>
            
            <div className="flex flex-wrap gap-4">
                <div className="bg-white px-6 py-3 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center min-w-[120px]">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Tickets</span>
                    <span className="text-2xl font-bold text-blue-600">{formatNumber(totalTickets)}</span>
                </div>
                <div className="bg-white px-6 py-3 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center min-w-[120px]">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Total Éléments</span>
                    <span className="text-2xl font-bold text-emerald-600">{formatNumber(totalElements)}</span>
                </div>
                <div className="bg-white px-6 py-3 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center min-w-[120px]">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Coût Fixe Total</span>
                    <span className="text-2xl font-bold text-purple-600">{totalFixedCost.toFixed(2)} €</span>
                </div>
                <div className="bg-white px-6 py-3 rounded-lg border border-gray-100 shadow-sm flex flex-col items-center min-w-[120px]">
                    <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Coût Horaire Total</span>
                    <span className="text-2xl font-bold text-amber-600">{totalTimeCost.toFixed(2)} €</span>
                </div>
            </div>
        </div>

        <section className="mb-12">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">{t('statut_tickets', 'Statut des Tickets')}</h2>
                <div className="flex gap-4">
                    <select 
                        value={ticketStatusFilter}
                        onChange={(e) => setTicketStatusFilter(e.target.value)}
                        className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg block p-2.5 shadow-sm outline-none"
                    >
                        <option value="all">Tous les statuts</option>
                        <option value="1">Nouveau</option>
                        <option value="2">En cours (Attente)</option>
                        <option value="6">Terminé</option>
                    </select>
                    <select 
                        value={ticketTypeFilter}
                        onChange={(e) => setTicketTypeFilter(e.target.value)}
                        className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg block p-2.5 shadow-sm outline-none"
                    >
                        <option value="all">Tous les types</option>
                        <option value="1">Incidents uniquement</option>
                        <option value="2">Demandes uniquement</option>
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <MinimalTile 
                    title={(lang === 'mg' && dbColors['nouveau']?.translation) ? dbColors['nouveau'].translation : t('nouveau', 'Nouveau')} 
                    count={ticketStats.nouveaux} 
                    iconColorClass="bg-green-100 text-green-600" 
                    svgIcon={DefaultIcon} 
                    onClick={() => openModalForDetails({ 
                        name: (lang === 'mg' && dbColors['nouveau']?.translation) ? dbColors['nouveau'].translation : t('nouveau', 'Nouveau'), 
                        allItems: getUnrolledTickets(filteredTickets.filter(t => getTicketStatusCode(t) === 1)),
                        isTicket: true
                    })} 
                />
                <MinimalTile 
                    title={(lang === 'mg' && dbColors['in_progress']?.translation) ? dbColors['in_progress'].translation : t('in_progress', 'En cours')} 
                    count={ticketStats.assignes} 
                    iconColorClass="bg-blue-100 text-blue-600" 
                    svgIcon={DefaultIcon} 
                    onClick={() => openModalForDetails({ 
                        name: (lang === 'mg' && dbColors['in_progress']?.translation) ? dbColors['in_progress'].translation : t('in_progress', 'En cours'), 
                        allItems: getUnrolledTickets(filteredTickets.filter(t => getTicketStatusCode(t) === 2)),
                        isTicket: true
                    })} 
               />
                {/*
                <MinimalTile 
                    title={t('en_attente', 'En attente')} count={ticketStats.enAttente} iconColorClass="bg-orange-100 text-orange-600" svgIcon={DefaultIcon} 
                    onClick={() => openModalForDetails({ name: t('tickets_en_attente', 'Tickets en attente'), allItems: getUnrolledTickets(filteredTickets.filter(t => getTicketStatusCode(t) === 4)) })} 
                />
                <MinimalTile 
                    title={t('planifies', 'Planifiés')} count={ticketStats.planifies} iconColorClass="bg-indigo-100 text-indigo-600" svgIcon={DefaultIcon} 
                    onClick={() => openModalForDetails({ name: t('tickets_planifies', 'Tickets planifiés'), allItems: getUnrolledTickets(filteredTickets.filter(t => getTicketStatusCode(t) === 3)) })} 
                />
                <MinimalTile 
                    title={t('resolus', 'Résolus')} count={ticketStats.resolus} iconColorClass="bg-teal-100 text-teal-600" svgIcon={DefaultIcon} 
                    onClick={() => openModalForDetails({ name: t('tickets_resolus', 'Tickets résolus'), allItems: getUnrolledTickets(filteredTickets.filter(t => getTicketStatusCode(t) === 5)) })} 
                /> */}
                <MinimalTile 
                    title={(lang === 'mg' && dbColors['termine']?.translation) ? dbColors['termine'].translation : t('termine', 'Terminé')} 
                    count={ticketStats.fermes} 
                    iconColorClass="bg-gray-100 text-gray-500" 
                    svgIcon={DefaultIcon} 
                    onClick={() => openModalForDetails({ 
                        name: (lang === 'mg' && dbColors['termine']?.translation) ? dbColors['termine'].translation : t('termine', 'Terminé'), 
                        allItems: getUnrolledTickets(filteredTickets.filter(t => getTicketStatusCode(t) === 6)),
                        isTicket: true
                    })} 
                />
            </div>
        </section>

        <section>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-800">Parc Informatique</h2>
                <select 
                    value={elementCategoryFilter}
                    onChange={(e) => setElementCategoryFilter(e.target.value)}
                    className="bg-white border border-gray-200 text-gray-700 text-sm rounded-lg block p-2.5 shadow-sm outline-none"
                >
                    <option value="all">Toutes les catégories</option>
                    {elements.map((e, idx) => (
                        <option key={idx} value={e.itemName}>{e.name || e.itemName}</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredElements.map((element, index) => {
                    const colors = ['bg-blue-50 text-blue-500', 'bg-emerald-50 text-emerald-500', 'bg-purple-50 text-purple-500', 'bg-amber-50 text-amber-500', 'bg-rose-50 text-rose-500'];
                    const iconColorClass = colors[index % colors.length];

                    return (
                        <MinimalTile
                            key={index}
                            title={element.name || element.itemName}
                            count={element.allItems?.length || 0}
                            iconColorClass={iconColorClass}
                            svgIcon={DefaultIcon}
                            onClick={() => openModalForDetails(element)}
                        />
                    );
                })}
                
                {filteredElements.length === 0 && (
                    <p className="text-gray-400 col-span-full">Aucun élément trouvé pour cette catégorie.</p>
                )}
            </div>
        </section>

        {isModalOpen && (
            <Detail
                open={isModalOpen} 
                element={selectedElement} 
                onClose={() => setIsModalOpen(false)}
                dataList={selectedElement?.allItems || []} 
                isTicketView={selectedElement?.isTicket || selectedElement?.name?.toLowerCase().includes('ticket') || selectedElement?.name?.toLowerCase().includes('entrant')}
            />
        )}
    </div>
);
}