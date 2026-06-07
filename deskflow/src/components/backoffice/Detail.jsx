import React, { useState, useEffect } from 'react';
import { Modal } from "../templates";
import { fetchDataAPIRest } from '../../services/apiClient';

const extractValue = (field) => {
    if (field === null || field === undefined || field === '' || field === 0 || field === '0') return null;
    
    if (Array.isArray(field)) {
        if (field.length === 0) return null;
        return field.map(f => f.completename || f.name || f.value || f.id).join(', ') || null;
    }
    
    if (typeof field === 'object') {
        return field.completename || field.name || field.value || field.id || null;
    }
    
    return String(field);
};

const getModelName = (item) => {
    if (item.model) {
        const val = extractValue(item.model);
        if (val) return val;
    }
    if (item.models_id) {
        const val = extractValue(item.models_id);
        if (val) return val;
    }
    for (const key of Object.keys(item)) {
        if (key.endsWith('models_id')) {
            const val = extractValue(item[key]);
            if (val) return val;
        }
    }
    return '-';
};

const getTypeName = (item) => {
    if (item.type) {
        const val = extractValue(item.type);
        if (val) return val;
    }
    for (const key of Object.keys(item)) {
        if (key.endsWith('types_id')) {
            const val = extractValue(item[key]);
            if (val) return val;
        }
    }
    return item.itemtype || '-';
};

const formatDuration = (secondsField) => {
    if (secondsField === null || secondsField === undefined || secondsField === '') return '0m';
    let val = typeof secondsField === 'object' ? (secondsField.value || secondsField.id) : secondsField;
    const totalSeconds = parseInt(val, 10);
    if (isNaN(totalSeconds) || totalSeconds === 0) return '0m';
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
};

const formatFixedCost = (costField) => {
    if (costField === null || costField === undefined || costField === '') return '0.00 €';
    let val = typeof costField === 'object' ? (costField.value || costField.id) : costField;
    const cost = parseFloat(String(val).replace(',', '.'));
    if (isNaN(cost)) return '0.00 €';
    return `${cost.toFixed(2)} €`;
};

const formatTimeCost = (costField) => {
    if (costField === null || costField === undefined || costField === '') return '0.00 €';
    let val = typeof costField === 'object' ? (costField.value || costField.id) : costField;
    const cost = parseFloat(String(val).replace(',', '.'));
    if (isNaN(cost)) return '0.00 €';
    return `${cost.toFixed(2)} €`;
};

const stripHtml = (html) => {
    if (!html) return '-';
    let text = String(html).replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ');
    return text.length > 50 ? text.substring(0, 50) + '...' : text;
};

const formatTicketStatus = (statusField) => {
    if (!statusField) return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">Inconnu</span>;
    const id = typeof statusField === 'object' ? parseInt(statusField.id, 10) : parseInt(statusField, 10);

    switch (id) {
        case 1: return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">Nouveau</span>;
        case 2: return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs">En cours</span>;
        case 3: return <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs">Planifié</span>;
        case 4: return <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">En attente</span>;
        case 5: return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Résolu</span>;
        case 6: return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">Clos</span>;
        default: 
            const text = typeof statusField === 'object' ? statusField.name : String(statusField);
            return <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">{text || 'Inconnu'}</span>;
    }
};

function GlpiDocumentImage({ docId, alt, className, onError }) {
    const [src, setSrc] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let active = true;
        let objectUrl = null;
        async function loadImage() {
            try {
                const response = await fetchDataAPIRest(`Document/${docId}?alt=media`, {
                    axiosConfig: { responseType: 'blob' }
                });
                if (active) {
                    objectUrl = URL.createObjectURL(response);
                    setSrc(objectUrl);
                }
            } catch (err) {
                if (active) setError(true);
            }
        }
        loadImage();
        return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    }, [docId]);

    if (error) return <span className="text-gray-400 text-xs italic">Erreur lien</span>;
    if (!src) return <span className="text-gray-400 text-xs italic">Chargement…</span>;
    return <img src={src} alt={alt || "Aperçu"} className={className} onError={onError} />;
}

export default function Detail({ open, onClose, element, isTicketView, dataList = [] }) {
    if (!open) return null;

    const RenderImageCell = ({ item }) => {
        const doc = item._documents && item._documents.find(d => d && d.filepath);
        const docId = doc ? doc.id : null;
        const imageUrl = item.picture_url || item.image || item.picture;        
        return (
            <td className="px-4 py-3">
                {docId ? <GlpiDocumentImage docId={docId} className="w-12 h-12 object-cover rounded border border-gray-200 shadow-sm" /> 
                : imageUrl ? <img src={imageUrl} className="w-12 h-12 object-cover rounded border border-gray-200 shadow-sm" onError={(e) => { e.target.style.display = 'none'; }} /> 
                : <span className="text-gray-400 text-xs italic">Aucune</span>}
            </td>
        );
    };
    
    const renderElementsTable = () => (
        <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Image</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Nom</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Statut</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Lieu</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Fabricant</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Modèle</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">N° Inventaire</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {dataList.length === 0 ? (
                    <tr><td colSpan="8" className="p-4 text-center text-gray-500">Aucun équipement trouvé.</td></tr>
                ) : (
                    dataList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                            <RenderImageCell item={item} />
                            <td className="px-4 py-3 font-medium text-gray-800">{item.name || '-'}</td>
                            <td className="px-4 py-3">{formatTicketStatus(item.states_id || item.status)}</td>
                            <td className="px-4 py-3">{extractValue(item.location || item.locations_id) || '-'}</td>
                            <td className="px-4 py-3">{extractValue(item.manufacturer || item.manufacturers_id) || '-'}</td>
                            <td className="px-4 py-3 text-blue-600 font-medium">{getTypeName(item)}</td>
                            <td className="px-4 py-3">{getModelName(item)}</td>
                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{item.inventory_number || item.otherserial || item.serial || '-'}</td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );

    const renderTicketsTable = () => (
        <table className="w-full text-left border-collapse">
            <thead className="bg-gray-100 sticky top-0 z-10">
                <tr>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Image</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">ID</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Titre</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Description</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Durée</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Fixed Cost</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Time Cost</th>
                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Statut</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
                {dataList.length === 0 ? (
                    <tr><td colSpan="8" className="p-4 text-center text-gray-500">Aucun ticket trouvé.</td></tr>
                ) : (
                    dataList.map((item, idx) => {
                        const id = item.id || item.tickets_id || item.ticket_id;
                        const title = item.name || item.title || item.titre;
                        const description = item.content || item.description;

                        return (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <RenderImageCell item={item} />
                                <td className="px-4 py-3 font-medium">{id || '-'}</td>
                                <td className="px-4 py-3 font-medium text-gray-800">{title || '-'}</td>
                                <td className="px-4 py-3 text-sm text-gray-500">{stripHtml(description)}</td>
                                <td className="px-4 py-3 text-sm text-gray-600">{formatDuration(item.actiontime)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{formatFixedCost(item.cost_fixed)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 font-semibold">{formatTimeCost(item.cost_time)}</td>
                                <td className="px-4 py-3">{formatTicketStatus(item.status || item.statut)}</td>
                            </tr>
                        );
                    })
                )}
            </tbody>
        </table>
    );

    return (
        <Modal open={open} onClose={onClose} title={`Détails : ${element?.name || ''}`} className="max-w-7xl w-full">
            <Modal.Body className="max-h-[70vh] overflow-y-auto relative p-0 border border-gray-200 rounded-md mx-4 mb-2">
                {isTicketView ? renderTicketsTable() : renderElementsTable()}
            </Modal.Body>
            <Modal.Footer className="px-4 py-3 bg-gray-50 rounded-b-lg border-t border-gray-200">
                <button onClick={onClose} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg">Fermer</button>
            </Modal.Footer>
        </Modal>
    );
}