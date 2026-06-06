import React, { useState, useEffect } from 'react';
import { Modal } from "../templates";
import { fetchDataAPIRest } from '../../services/apiClient'; // Vérifie ce chemin d'import !

const extractValue = (field) => {
    if (field === null || field === undefined || field === '') return '-';
    if (typeof field === 'object') return field.name || field.value || field.id || '-';
    return field;
};

const splitDateTime = (dateTimeStr) => {
    if (!dateTimeStr) return { date: '-', time: '-' };
    const parts = dateTimeStr.split(' ');
    return {
        date: parts[0] || '-',
        time: parts[1] ? parts[1].substring(0, 5) : '-'
    };
};

const stripHtml = (html) => {
    if (!html) return '-';
    let text = html.replace(/<[^>]*>?/gm, '');
    text = text.replace(/&nbsp;/g, ' ');
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
};

const formatTicketStatus = (statusObj) => {
    const safeValue = extractValue(statusObj); 
    const id = parseInt(safeValue, 10);

    switch (id) {
        case 1: return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Nouveau</span>;
        case 2: return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Assigné</span>;
        case 3: return <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">Planifié</span>;
        case 4: return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">En attente</span>;
        case 5: return <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded-full text-xs">Résolu</span>;
        case 6: return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Fermé</span>;
        default: return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{safeValue || 'Inconnu'}</span>;
    }
};

const formatTicketPriority = (priorityObj) => {
    const safeValue = extractValue(priorityObj);
    const id = parseInt(safeValue, 10);

    switch (id) {
        case 1: return "Très basse";
        case 2: return "Basse";
        case 3: return "Moyenne";
        case 4: return "Haute";
        case 5: return "Très haute";
        case 6: return "Majeure";
        default: return safeValue || '-';
    }
};

const formatTicketType = (typeId) => {
    const id = extractValue(typeId);
    if (String(id) === '1' || String(id).toLowerCase().includes('incident')) return 'Incident';
    if (String(id) === '2' || String(id).toLowerCase().includes('demande')) return 'Demande';
    return id;
};

const TicketRow = ({ item }) => {
    const [linkedItems, setLinkedItems] = useState('Chargement...');

    useEffect(() => {
        let isMounted = true; 

        const fetchLinkedItems = async () => {
            try {
                const data = await fetchDataAPIRest(`Ticket/${item.id}/Item_Ticket?expand_dropdowns=true`);
                
                if (isMounted) {
                    if (data && data.length > 0) {
                        const formattedLinks = data.map(link => {
                            const type = link.itemtype || 'Élément';
                           // const idOrName = typeof link.items_id === 'object' ? (link.items_id.name || link.items_id.id) : link.items_id;
                            return `${type} `;
                        }).join(' | ');
                        
                        setLinkedItems(formattedLinks);
                    } else {
                        setLinkedItems('-'); 
                    }
                }
            } catch (error) {
                if (isMounted) setLinkedItems('Erreur');
                console.error(`Erreur chargement liaison ticket ${item.id}`, error);
            }
        };

        fetchLinkedItems();

        return () => { isMounted = false; };
    }, [item.id]);

    const { date, time } = splitDateTime(item.date);

    return (
        <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
            <td className="px-4 py-3 font-medium text-gray-900">#{item.id}</td>
            <td className="px-4 py-3">{date}</td>
            <td className="px-4 py-3 text-gray-400">{time}</td>
            <td className="px-4 py-3">{formatTicketType(item.type)}</td>
            <td className="px-4 py-3 font-medium text-gray-800">{item.name || '-'}</td>
            <td className="px-4 py-3 text-gray-500" title={stripHtml(item.content)}>{stripHtml(item.content)}</td>
            <td className="px-4 py-3">{formatTicketStatus(item.status)}</td>
            <td className="px-4 py-3">{formatTicketPriority(item.priority)}</td>
            <td className="px-4 py-3 text-blue-500 font-medium text-xs">
                {linkedItems}
            </td>
        </tr>
    );
};

export default function Detail({ element, onClose }) {
    const isTicketView = element?.name?.toLowerCase().includes('ticket') || 
                         element?.name?.toLowerCase().includes('incident') || 
                         element?.name?.toLowerCase().includes('demande');
                         
    const items = element?.allItems || [];

    const renderTicketsTable = () => (
        <table className="w-full text-sm text-left text-gray-500 border-collapse">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                    <th className="px-4 py-3 font-semibold">Ref</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Heure</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Titre</th>
                    <th className="px-4 py-3 font-semibold">Description</th>
                    <th className="px-4 py-3 font-semibold">Statut</th>
                    <th className="px-4 py-3 font-semibold">Priorité</th>
                    <th className="px-4 py-3 font-semibold">Éléments liés</th>
                </tr>
            </thead>
            <tbody>
                {items.length === 0 ? (
                    <tr><td colSpan="9" className="px-4 py-4 text-center">Aucun ticket trouvé.</td></tr>
                ) : (
                
                    items.map((item, idx) => <TicketRow key={item.id || idx} item={item} />)
                )}
            </tbody>
        </table>
    );

    const renderElementsTable = () => (
        <table className="w-full text-sm text-left text-gray-500 border-collapse">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200 sticky top-0">
                <tr>
                    <th className="px-4 py-3 font-semibold">Nom</th>
                    <th className="px-4 py-3 font-semibold">Statut</th>
                    <th className="px-4 py-3 font-semibold">Lieu</th>
                    <th className="px-4 py-3 font-semibold">Fabricant</th>
                    <th className="px-4 py-3 font-semibold">Type</th>
                    <th className="px-4 py-3 font-semibold">Modèle</th>
                    <th className="px-4 py-3 font-semibold">N° Inventaire</th>
                </tr>
            </thead>
            <tbody>
                {items.length === 0 ? (
                    <tr><td colSpan="7" className="px-4 py-4 text-center">Aucun élément trouvé.</td></tr>
                ) : (
                    items.map((item, idx) => (
                        <tr key={item.id || idx} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-medium text-gray-900">{item.name || '-'}</td>
                            <td className="px-4 py-3">
                                {extractValue(item.states_id) !== '-' ? (
                                    <span className="px-2 py-1 bg-gray-100 rounded-md text-xs">{extractValue(item.states_id)}</span>
                                ) : '-'}
                            </td>
                            <td className="px-4 py-3">{extractValue(item.locations_id)}</td>
                            <td className="px-4 py-3">{extractValue(item.manufacturers_id)}</td>
                            <td className="px-4 py-3 text-blue-600 font-medium">{item.itemtype || extractValue(item.itemtype_id) || '-'}</td>
                            <td className="px-4 py-3">{extractValue(item.models_id) || extractValue(item.computermodels_id) || '-'}</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.inventory_number || item.otherserial || '-'}</td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );

    return (
        <Modal open={true} onClose={onClose} title={`Détails : ${element?.name}`} className="max-w-7xl w-full">
            <Modal.Body className="max-h-[70vh] overflow-y-auto relative p-0 border border-gray-200 rounded-md mx-4 mb-2">
                {isTicketView ? renderTicketsTable() : renderElementsTable()}
            </Modal.Body>
            <Modal.Footer className="px-4 py-3 bg-gray-50 rounded-b-lg border-t border-gray-200">
                <button 
                    onClick={onClose} 
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                    Fermer
                </button>
            </Modal.Footer>
        </Modal>
    );
}