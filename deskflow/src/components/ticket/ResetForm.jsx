import { useState } from 'react';
import { purgeSelectedTables } from '../../utils/resetHelper';
import { H3, P, Button, Card, Alert } from '../templates';

export default function ResetForm({ onResetComplete }) {
  const availableTables = [
    { label: "Tickets d'assistance", endpoint: 'Ticket' },
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
      alert("Veuillez selectionner au moins une table a reinitialiser.");
      return;
    }
    const confirm = window.confirm(
      "ATTENTION : Vous etes sur le point de supprimer DEFINITIVEMENT toutes les donnees des tables selectionnees via l'API. Cette action est irreversible. Voulez-vous continuer ?"
    );
    if (!confirm) return;

    setIsPurging(true);
    setStatusMessage('Demarrage de la purge...');

    try {
      const deletedCount = await purgeSelectedTables(selectedTables, (message, current, total) => {
        setStatusMessage(`${message} (${current}/${total})`);
      });

      alert(`Reinitialisation terminee.\n${deletedCount} element(s) supprime(s).`);
      if (onResetComplete) onResetComplete();
      setSelectedTables([]);

    } catch (error) {
      alert(`Erreur lors de la reinitialisation : ${error.message}`);
    } finally {
      setIsPurging(false);
      setStatusMessage('');
    }
  };

  return (
    <Card>
      <Card.Body>
        <H3 className="mb-4">Reinitialisation des donnees</H3>
        <form onSubmit={handleResetSubmit}>
          <P className="mb-3">Selectionnez les tables a vider via l'API :</P>

          <div className="flex flex-col gap-2 mb-4">
            {availableTables.map((table) => (
              <label key={table.endpoint} className="flex items-center gap-2 cursor-pointer text-sm text-neutral-700">
                <input
                  type="checkbox"
                  value={table.endpoint}
                  checked={selectedTables.includes(table.endpoint)}
                  onChange={() => handleCheckboxChange(table.endpoint)}
                  disabled={isPurging}
                  className="accent-black"
                />
                {table.label}
                <span className="text-neutral-400 text-xs">({table.endpoint})</span>
              </label>
            ))}
          </div>

          <Button
            type="submit"
            disabled={isPurging || selectedTables.length === 0}
          >
            {isPurging ? 'Purge en cours...' : 'Vider les tables selectionnees'}
          </Button>

          {statusMessage && (
            <Alert className="mt-4">{statusMessage}</Alert>
          )}
        </form>
      </Card.Body>
    </Card>
  );
}