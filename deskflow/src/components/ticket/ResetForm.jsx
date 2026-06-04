import React, { useState } from 'react';
import { purgeSelectedTables } from '../../utils/resetHelper';

export default function ResetForm({ onResetComplete }) {
  const availableTables = [
    { label: 'Tickets d\'assistance', endpoint: 'Ticket' },
 
  ];

  const [selectedTables, setSelectedTables] = useState([]);
  const [isPurging, setIsPurging] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleCheckboxChange = (endpoint) => {
    setSelectedTables(prev => 
      prev.includes(endpoint) 
        ? prev.filter(t => t !== endpoint) 
        : [...prev, endpoint]          
    );
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();

    if (selectedTables.length === 0) {
      alert("Veuillez sélectionner au moins une table à réinitialiser.");
      return;
    }
    const confirm = window.confirm(
      " ATTENTION : Vous êtes sur le point de supprimer DÉFINITIVEMENT toutes les données des tables sélectionnées via l'API. Cette action est irréversible. Voulez-vous continuer ?"
    );
    if (!confirm) return;

    setIsPurging(true);
    setStatusMessage('Démarrage de la purge...');

    try {
      const deletedCount = await purgeSelectedTables(selectedTables, (message, current, total) => {
        setStatusMessage(`${message} (${current}/${total})`);
      });

      alert(` Réinitialisation terminée.\n${deletedCount} élément(s) supprimé(s).`);
      if (onResetComplete) onResetComplete();
  
      setSelectedTables([]);

    } catch (error) {
      alert(` Erreur lors de la réinitialisation : ${error.message}`);
    } finally {
      setIsPurging(false);
      setStatusMessage('');
    }
  };

  return (
    <div >
      <form onSubmit={handleResetSubmit}>
        <p>Sélectionnez les tables à vider via l'API :</p>
        
        <div style={{ marginBottom: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {availableTables.map((table) => (
            <label key={table.endpoint} style={{ cursor: 'pointer' }}>
              <input
                type="checkbox"
                value={table.endpoint}
                checked={selectedTables.includes(table.endpoint)}
                onChange={() => handleCheckboxChange(table.endpoint)}
                disabled={isPurging}
                style={{ marginRight: '8px' }}
              />
              {table.label} <small style={{ color: '#666' }}>({table.endpoint})</small>
            </label>
          ))}
        </div>

        <button 
          type="submit" 
          disabled={isPurging || selectedTables.length === 0}
          style={{ backgroundColor: '#dc3545', color: 'white', opacity: isPurging ? 0.7 : 1 }}
        >
          {isPurging ? 'Purge en cours...' : 'Vider les tables sélectionnées '}
        </button>

        {statusMessage && <p style={{ color: '#dc3545', fontWeight: 'bold', marginTop: '10px' }}> {statusMessage}</p>}
      </form>
    </div>
  );
}