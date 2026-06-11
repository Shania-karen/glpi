import { useState, useEffect, useMemo } from 'react';
import { Kanban, Badge, Spinner } from '../templates';
import { useTickets } from '../../hooks/useTicket';
import { updateTicketStatus } from '../../utils/ticketHelper';
import { NavLink } from 'react-router-dom';
import TicketFiche from './TicketFiche';
import { useLanguage } from '../../context/LanguageContext';

export default function TicketKanban() {
const { tickets, loading, error, loadTickets } = useTickets();
const [activeColumnId, setActiveColumnId] = useState(null);
const [selectedElement, setSelectedElement] = useState(null);
const [isModalOpen, setIsModalOpen] = useState(false);
const [dbColors, setDbColors] = useState({});
const { lang, t } = useLanguage();

const statuses = useMemo(() => [
    { 
        id: 'nouveau', 
        title: (lang === 'mg' && dbColors['nouveau']?.translation) ? dbColors['nouveau'].translation : t('nouveau', 'Nouveau'), 
        color: 'blue' 
    },
    { 
        id: 'in_progress', 
        title: (lang === 'mg' && dbColors['in_progress']?.translation) ? dbColors['in_progress'].translation : t('in_progress', 'En cours'), 
        color: 'orange' 
    },
    { 
        id: 'termine', 
        title: (lang === 'mg' && dbColors['termine']?.translation) ? dbColors['termine'].translation : t('termine', 'Terminé'), 
        color: 'success' 
    }
], [lang, dbColors, t]);

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

const getColumnStyle = (statusId) => {
    const config = dbColors[statusId];
    const color = config?.color;
    if (!color) return {};
    if (color.startsWith('#')) {
        return { backgroundColor: color + '12' }; 
    }
    return { backgroundColor: color };
};
const getTicketColumnId = (ticket) => {
const rawStatus = ticket.status !== undefined ? ticket.status : ticket.statut;


if (!rawStatus) return 'nouveau';

let statusToTest = rawStatus;
if (typeof rawStatus === 'object') {
    statusToTest = rawStatus.id !== undefined ? rawStatus.id : (rawStatus.name || rawStatus.value);
}

const statusStr = String(statusToTest).toLowerCase();

if (statusStr === '1' || statusStr.includes('nouveau') || statusStr === 'new') return 'nouveau';
if (statusStr === '2' || statusStr === '3' || statusStr === '4' || statusStr.includes('assign') || statusStr.includes('cours') || statusStr.includes('planifi') || statusStr.includes('attente')) {
    return 'in_progress';
}

if (statusStr === '5' || statusStr === '6' || statusStr.includes('résolu') || statusStr.includes('resolu') || statusStr.includes('ferm') || statusStr.includes('clos') || statusStr === 'solved' || statusStr === 'closed') {
    return 'termine';
}

return 'nouveau';
};
const statusMap = {
    nouveau: 1,     
    in_progress: 2,  
    termine: 6    
};

if (loading) {
return (
    <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
    </div>
);
}

if (error) {
return (
    <div className="p-6 text-red-600 bg-red-50 border border-red-200 rounded-lg">
        Erreur lors du chargement des tickets : {error}
    </div>
);
}
const openModalForDetails = (element) => {
    setSelectedElement(element);
    setIsModalOpen(true);
};

return (
<div className="p-6 bg-neutral-50 min-h-screen">
    <div className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">{t('kanban_title', 'Kanban des Tickets')}</h1>
    </div>

    <Kanban onCardMove={async (ticketId, sourceColId, targetColId) => {
        const newStatusId = statusMap[targetColId];
        if (ticketId && newStatusId) {
            await updateTicketStatus(ticketId, newStatusId);
            loadTickets(); 
        }
    }}>
        {statuses.map(status => {
            const columnTickets = tickets.filter(
                ticket => getTicketColumnId(ticket) === status.id
            );

            const test='test';
             return (
                <Kanban.Column
                    key={status.id}
                    id={status.id}
                    title={status.title}
                    count={columnTickets.length}
                    className={activeColumnId === status.id ? 'border-neutral-900 ring-2 ring-neutral-200/50' : ''}
                    style={getColumnStyle(status.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={() => setActiveColumnId(status.id)}
                    onDragLeave={() => setActiveColumnId(null)}
                    onDrop={async (e) => {
                        e.preventDefault();
                        setActiveColumnId(null);
                        
                        const ticketId = e.dataTransfer.getData('cardId');
                        const newStatusId = statusMap[status.id];
                        
                        if (ticketId && newStatusId) {
                            await updateTicketStatus(ticketId, newStatusId);
                            loadTickets();
                        }
                    }}
                >
                    {columnTickets.length === 0 ? (
                        <p className="text-xs text-neutral-400 italic text-center py-8 bg-white border border-dashed border-neutral-200 rounded-lg">
                            {t('no_tickets', 'Aucun ticket dans cette catégorie')}
                        </p>
                    ) : (
                        columnTickets.map(ticket => {
                            return (
                                <Kanban.Card
                                    key={ticket.id}
                                    id={ticket.id}
                                    columnId={status.id}
                                    onClick={() => openModalForDetails({ id: ticket.id, name: ticket.name, allItems: ticket.unrolledLines || [ticket] })} 
                                    draggable={true}
                                >
                                    <Kanban.Card.Header>
                                        <span className="font-semibold text-xs text-neutral-400">#{ticket.id}</span>
                                        <Badge 
                                            variant={dbColors[status.id]?.color ? undefined : status.color}
                                            style={dbColors[status.id]?.color ? { backgroundColor: dbColors[status.id].color, color: '#fff', border: 'none' } : undefined}
                                        >
                                            {status.title}
                                        </Badge>
                                    </Kanban.Card.Header>
                                    
                                    <Kanban.Card.Body className="mt-2">
                                        <h3 className="font-bold text-sm text-neutral-800 line-clamp-2 mb-1">
                                            {ticket.name || 'Sans titre'}
                                        </h3>
                                    </Kanban.Card.Body>
                                
                                    
                                </Kanban.Card>
                            );
                        })
                    )}
                    {status.id === 'nouveau' && (
                        <Kanban.Card draggable={false} className="border-dashed border-neutral-300 bg-neutral-50 hover:bg-neutral-100 transition-colors mt-2">
                            <Kanban.Card.Body className="flex justify-center items-center py-3">
                                <NavLink to="/tickets/new" className="text-xs font-semibold text-neutral-700 hover:text-black">
                                    + {t('add_ticket', 'Ajouter un ticket')}
                                </NavLink>
                            </Kanban.Card.Body>
                        </Kanban.Card>
                    )}
                </Kanban.Column>
            );
        })}
    </Kanban>
    {
        isModalOpen && (
            <TicketFiche
                open={isModalOpen} 
                ticketId={selectedElement?.id} 
                onClose={() => setIsModalOpen(false)}
                onSaved={loadTickets}
            />
        )
    }
</div>
);
}
