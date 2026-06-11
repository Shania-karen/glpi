import React, { createContext, useContext, useState } from 'react';

const KanbanContext = createContext(null);

export default function Kanban({ children, onCardMove, className = '', ...rest }) {
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [draggedSourceColumnId, setDraggedSourceColumnId] = useState(null);

  return (
    <KanbanContext.Provider
      value={{
        onCardMove,
        draggedCardId,
        setDraggedCardId,
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
  const { onCardMove, setDraggedCardId, setDraggedSourceColumnId } = useContext(KanbanContext);
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
    const cardId = e.dataTransfer.getData('cardId');
    const sourceColumnId = e.dataTransfer.getData('sourceColumnId');
    if (onCardMove && cardId && sourceColumnId && sourceColumnId !== id) {
      onCardMove(cardId, sourceColumnId, id);
    }
    setDraggedCardId(null);
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

Kanban.Card = function KanbanCard({ id, columnId, draggable = true, children, className = '', ...rest }) {
  const { setDraggedCardId, setDraggedSourceColumnId } = useContext(KanbanContext);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('cardId', id);
    e.dataTransfer.setData('sourceColumnId', columnId);
    setDraggedCardId(id);
    setDraggedSourceColumnId(columnId);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedCardId(null);
    setDraggedSourceColumnId(null);
  };

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragEnd={draggable ? handleDragEnd : undefined}
      className={`bg-white border border-neutral-200 rounded-lg p-2.5 shadow-sm hover:shadow hover:border-neutral-300 transition-all duration-150 ${
        draggable ? 'cursor-grab active:cursor-grabbing' : ''
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
