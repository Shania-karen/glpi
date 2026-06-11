# Guide d'implémentation : Sélection multiple sur le Kanban

Ce document détaille les fichiers à modifier, les fonctions à ajouter et la démarche technique pour implémenter une **sélection multiple de tickets (cartes)** sur le Kanban, permettant des actions groupées (glisser-déposer de plusieurs cartes en même temps, changement de statut groupé via une barre d'actions, etc.).

---

## 1. Fichiers à modifier

Pour réaliser cette fonctionnalité, nous devons modifier trois fichiers principaux :

1. **`deskflow/src/components/templates/Kanban.jsx`** : Pour ajouter le support visuel et technique (Drag & Drop multiple) au composant réutilisable.
2. **`deskflow/src/components/ticket/TicketKanban.jsx`** : Pour gérer l'état des tickets sélectionnés, ajouter l'interface de sélection (cases à cocher/boutons) et l'UI des actions groupées.
3. **`deskflow/src/utils/ticketHelper.js`** : Pour ajouter une fonction utilitaire de mise à jour en lot (bulk update) des statuts des tickets via l'API Rest de GLPI.

---

## 2. Modifications détaillées et Code source

### A. Modifications dans `deskflow/src/utils/ticketHelper.js`

Actuellement, nous avons la fonction `updateTicketStatus(ticketId, newStatusId)` qui traite un ticket à la fois. Nous devons ajouter une fonction de traitement par lot.

```javascript
// À ajouter dans deskflow/src/utils/ticketHelper.js

/**
 * Met à jour le statut de plusieurs tickets en parallèle.
 * @param {Array<number|string>} ticketIds - Liste des identifiants des tickets.
 * @param {number} newStatusId - Le nouvel ID de statut (1: Nouveau, 2: En cours, 6: Terminé).
 */
export async function updateMultipleTicketsStatus(ticketIds, newStatusId) {
    try {
        const promises = ticketIds.map(ticketId => 
            fetchDataAPIRest(`/Ticket/${ticketId}`, {
                method: 'PUT',
                body: {
                    input: {
                        id: ticketId,
                        status: newStatusId
                    }
                }
            })
        );
        const results = await Promise.all(promises);
        console.log(`${results.length} tickets mis à jour avec succès.`);
        return results;
    } catch (error) {
        console.error('Erreur lors de la mise à jour groupée des statuts:', error);
        throw error;
    }
}
```

---

### B. Modifications dans `deskflow/src/components/templates/Kanban.jsx`

Pour supporter le Drag & Drop de plusieurs cartes sélectionnées :
1. Les cartes doivent pouvoir recevoir un état `selected` (visuel).
2. L'événement `onDragStart` d'une carte doit envoyer tous les identifiants sélectionnés si la carte déplacée fait partie de la sélection.
3. L'événement `onDrop` de la colonne doit récupérer tous les identifiants et déclencher un callback avec le tableau d'identifiants.

#### Code modifié proposé pour `Kanban.jsx` :

```javascript
import React, { createContext, useContext, useState } from 'react';

const KanbanContext = createContext(null);

export default function Kanban({ children, onCardMove, className = '', ...rest }) {
  const [draggedCardIds, setDraggedCardIds] = useState([]);
  const [draggedSourceColumnId, setDraggedSourceColumnId] = useState(null);

  return (
    <KanbanContext.Provider
      value={{
        onCardMove,
        draggedCardIds,
        setDraggedCardIds,
        draggedSourceColumnId,
        setDraggedSourceColumnId,
      }}
    >
      <div
        className={`flex gap-5 overflow-x-auto pb-4 select-none items-start min-h-[400px] w-full ${className}`}
        {...rest}
      >
        {children}
      </div>
    </KanbanContext.Provider>
  );
}

Kanban.Column = function KanbanColumn({ id, title, count, children, horizontal = false, className = '', ...rest }) {
  const { onCardMove, setDraggedCardIds, setDraggedSourceColumnId } = useContext(KanbanContext);
  const [isOver, setIsOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsOver(true);
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    
    // Récupération des IDs sous forme de tableau JSON
    const rawIds = e.dataTransfer.getData('cardIds');
    const sourceColumnId = e.dataTransfer.getData('sourceColumnId');
    
    if (onCardMove && rawIds && sourceColumnId && sourceColumnId !== id) {
      try {
        const cardIds = JSON.parse(rawIds);
        onCardMove(cardIds, sourceColumnId, id);
      } catch (err) {
        // Fallback si ce n'est pas un JSON valide (glissement unique standard)
        onCardMove([rawIds], sourceColumnId, id);
      }
    }
    setDraggedCardIds([]);
    setDraggedSourceColumnId(null);
  };

  return (
    <div
      className={`flex flex-col rounded-xl bg-neutral-50/70 border transition-all duration-200 ${
        horizontal ? 'w-full' : 'flex-1 min-w-[220px] max-w-[280px]'
      } ${
        isOver
          ? 'border-neutral-900 bg-neutral-100/90 shadow-sm'
          : 'border-neutral-200/80 shadow-none'
      } ${className}`}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      {...rest}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-200/50">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-800 text-xs tracking-wide">{title}</span>
          {count !== undefined && (
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold bg-neutral-200/80 text-neutral-600 rounded-full">
              {count}
            </span>
          )}
        </div>
      </div>

      {/* Column Body */}
      <div className={`flex-1 p-2 ${
        horizontal 
          ? 'flex flex-row gap-2.5 overflow-x-auto min-h-[120px] items-start' 
          : 'overflow-y-auto space-y-2 min-h-[150px] max-h-[450px]'
      }`}>
        {children}
      </div>
    </div>
  );
};

Kanban.Card = function KanbanCard({ 
  id, 
  columnId, 
  draggable = true, 
  selected = false,
  selectedCardIds = [], // Passer la liste des sélectionnés pour le drag
  children, 
  className = '', 
  ...rest 
}) {
  const { setDraggedCardIds, setDraggedSourceColumnId } = useContext(KanbanContext);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    
    // Si la carte déplacée fait partie de la sélection, on déplace toute la sélection.
    // Sinon, on ne déplace que cette carte seule.
    const idsToMove = selectedCardIds.includes(id) ? selectedCardIds : [id];
    
    e.dataTransfer.setData('cardIds', JSON.stringify(idsToMove));
    e.dataTransfer.setData('sourceColumnId', columnId);
    
    setDraggedCardIds(idsToMove);
    setDraggedSourceColumnId(columnId);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedCardIds([]);
    setDraggedSourceColumnId(null);
  };

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragEnd={draggable ? handleDragEnd : undefined}
      className={`bg-white border rounded-lg p-2.5 shadow-sm hover:shadow transition-all duration-150 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
      } ${
        selected 
          ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/10' 
          : 'border-neutral-200 hover:border-neutral-300'
      } ${
        isDragging ? 'opacity-30 border-dashed border-neutral-400 bg-neutral-50/50 shadow-none' : ''
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
};

Kanban.Card.Header = function KanbanCardHeader({ className = '', children, ...rest }) {
  return (
    <div className={`flex items-start justify-between gap-1.5 mb-1.5 ${className}`} {...rest}>
      {children}
    </div>
  );
};

Kanban.Card.Body = function KanbanCardBody({ className = '', children, ...rest }) {
  return (
    <div className={`text-xs text-neutral-600 mb-1.5 break-words line-clamp-3 ${className}`} {...rest}>
      {children}
    </div>
  );
};

Kanban.Card.Footer = function KanbanCardFooter({ className = '', children, ...rest }) {
  return (
    <div className={`flex items-center justify-between text-[10px] text-neutral-400 pt-2 border-t border-neutral-100 ${className}`} {...rest}>
      {children}
    </div>
  );
};
```

---

### C. Modifications dans `deskflow/src/components/ticket/TicketKanban.jsx`

Dans ce composant principal, nous devons :
1. Gérer un état `selectedTicketIds` (tableau d'IDs).
2. Ajouter une case à cocher sur chaque carte, ou permettre la sélection au clic (en mode sélection).
3. Afficher une barre d'actions groupées en haut ou en bas du Kanban quand au moins un ticket est sélectionné.
4. Mettre à jour le gestionnaire `onCardMove` pour qu'il prenne en charge un tableau d'identifiants au lieu d'un seul.

#### Code modifié proposé pour `TicketKanban.jsx` :

```jsx
import { useState, useEffect, useMemo } from 'react';
import { Kanban, Badge, Spinner } from '../templates';
import { useTickets } from '../../hooks/useTicket';
import { updateMultipleTicketsStatus } from '../../utils/ticketHelper'; // Importation de la fonction de groupe
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

// NOUVEL ÉTAT : IDs des tickets sélectionnés
const [selectedTicketIds, setSelectedTicketIds] = useState([]);

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

const handleSelectTicket = (id, e) => {
    e.stopPropagation(); // Évite d'ouvrir le modal de détails
    setSelectedTicketIds(prev => 
        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
};

const handleBulkStatusChange = async (targetColId) => {
    const newStatusId = statusMap[targetColId];
    if (selectedTicketIds.length > 0 && newStatusId) {
        await updateMultipleTicketsStatus(selectedTicketIds, newStatusId);
        setSelectedTicketIds([]);
        loadTickets();
    }
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
    <div className="mb-8 flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-neutral-900">{t('kanban_title', 'Kanban des Tickets')}</h1>
            {selectedTicketIds.length > 0 && (
                <p className="text-sm text-neutral-500 mt-1">
                    {selectedTicketIds.length} ticket(s) sélectionné(s)
                </p>
            )}
        </div>
        
        {/* BARRE D'ACTIONS GROUPÉES */}
        {selectedTicketIds.length > 0 && (
            <div className="flex items-center gap-2 bg-white px-4 py-2 border rounded-lg shadow-sm">
                <span className="text-xs font-semibold text-neutral-600">Action groupée :</span>
                <button 
                    onClick={() => handleBulkStatusChange('nouveau')}
                    className="px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 rounded transition"
                >
                    Mettre en Nouveau
                </button>
                <button 
                    onClick={() => handleBulkStatusChange('in_progress')}
                    className="px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-700 hover:bg-orange-100 rounded transition"
                >
                    Mettre en En Cours
                </button>
                <button 
                    onClick={() => handleBulkStatusChange('termine')}
                    className="px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded transition"
                >
                    Mettre en Terminé
                </button>
                <div className="w-[1px] h-4 bg-neutral-200 mx-1"></div>
                <button 
                    onClick={() => setSelectedTicketIds([])}
                    className="text-xs text-neutral-400 hover:text-neutral-600 transition"
                >
                    Annuler
                </button>
            </div>
        )}
    </div>

    <Kanban onCardMove={async (ticketIds, sourceColId, targetColId) => {
        const newStatusId = statusMap[targetColId];
        if (ticketIds && ticketIds.length > 0 && newStatusId) {
            await updateMultipleTicketsStatus(ticketIds, newStatusId);
            setSelectedTicketIds([]);
            loadTickets(); 
        }
    }}>
        {statuses.map(status => {
            const columnTickets = tickets.filter(
                ticket => getTicketColumnId(ticket) === status.id
            );

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
                        
                        const rawIds = e.dataTransfer.getData('cardIds');
                        const newStatusId = statusMap[status.id];
                        
                        if (rawIds && newStatusId) {
                            try {
                                const ticketIds = JSON.parse(rawIds);
                                await updateMultipleTicketsStatus(ticketIds, newStatusId);
                            } catch (err) {
                                // Fallback si drag & drop standard d'un seul élément
                                await updateMultipleTicketsStatus([rawIds], newStatusId);
                            }
                            setSelectedTicketIds([]);
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
                            const isSelected = selectedTicketIds.includes(ticket.id);
                            return (
                                <Kanban.Card
                                    key={ticket.id}
                                    id={ticket.id}
                                    columnId={status.id}
                                    selected={isSelected}
                                    selectedCardIds={selectedTicketIds}
                                    onClick={() => openModalForDetails({ id: ticket.id, name: ticket.name, allItems: ticket.unrolledLines || [ticket] })} 
                                    draggable={true}
                                >
                                    <Kanban.Card.Header>
                                        <div className="flex items-center gap-1.5">
                                            {/* CHECKBOX DE SÉLECTION */}
                                            <input 
                                                type="checkbox" 
                                                checked={isSelected}
                                                onChange={(e) => handleSelectTicket(ticket.id, e)}
                                                onClick={(e) => e.stopPropagation()} // Important : ne pas ouvrir le détail
                                                className="w-3.5 h-3.5 rounded border-neutral-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                            />
                                            <span className="font-semibold text-xs text-neutral-400">#{ticket.id}</span>
                                        </div>
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
```

---

## 3. Avantages de cette solution

1. **Expérience utilisateur fluide** : Les tickets sélectionnés s'illuminent avec une bordure bleue pour être facilement identifiables.
2. **Double mode d'interaction** :
   - **Par Drag & Drop** : Sélectionner plusieurs tickets à l'aide de leur case à cocher, puis faire glisser un seul d'entre eux pour déplacer l'intégralité du groupe vers une autre colonne.
   - **Par Boutons d'Action** : Un panneau d'actions apparaît dynamiquement au sommet de la page dès qu'une sélection est active pour modifier le statut du groupe d'un seul clic.
3. **Robustesse technique** : En utilisant `Promise.all` dans `ticketHelper.js`, tous les appels réseaux s'effectuent simultanément sans bloquer l'interface.
