import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { H1, P } from '../../components/templates';
import { useLanguage } from '../../context/LanguageContext';

const PRESET_COLORS = [
  { name: 'Vert', hex: '#22c55e' },
  { name: 'Orange', hex: '#f97316' },
  { name: 'Rouge', hex: '#ef4444' },
  { name: 'Bleu', hex: '#3b82f6' },
  { name: 'Violet', hex: '#a855f7' },
  { name: 'Gris', hex: '#6b7280' },
];

export default function ColorManager() {
  const navigate = useNavigate();
  const { loadTranslations } = useLanguage();
  const [colors, setColors] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('nouveau');
  const [customStatus, setCustomStatus] = useState('');
  const [selectedColor, setSelectedColor] = useState('#22c55e');
  const [selectedTranslation, setSelectedTranslation] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const statusLabels = {
    nouveau: 'Nouveau / Entrant',
    in_progress: 'En cours / Assigné',
    termine: 'Terminé / Clos'
  };

  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('isBackOfficeAuth');
    if (isAuthenticated !== 'true') {
      navigate('/');
      return;
    }
    fetchColors();
  }, [navigate]);

  useEffect(() => {
    if (editingId) return; // Don't overwrite values if editing
    const existing = colors.find(c => c.status === selectedStatus);
    if (existing) {
      setSelectedColor(existing.color || '#22c55e');
      setSelectedTranslation(existing.translation || '');
    } else {
      setSelectedTranslation('');
    }
  }, [selectedStatus, colors, editingId]);

  const fetchColors = async () => {
    try {
      const res = await fetch('http://localhost:8081/api/colors');
      if (!res.ok) throw new Error('Failed to fetch colors');
      const data = await res.json();
      setColors(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const resetForm = () => {
    setEditingId(null);
    setSelectedStatus('nouveau');
    setCustomStatus('');
    setSelectedColor('#22c55e');
    setSelectedTranslation('');
  };

  const handleEdit = (config) => {
    setEditingId(config.id);
    if (statusLabels[config.status]) {
      setSelectedStatus(config.status);
      setCustomStatus('');
    } else {
      setSelectedStatus('custom');
      setCustomStatus(config.status);
    }
    setSelectedColor(config.color);
    setSelectedTranslation(config.translation || '');
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Voulez-vous vraiment supprimer cette configuration ? Elle sera réinitialisée aux valeurs par défaut.')) {
      return;
    }
    setMessage('');
    try {
      const response = await fetch(`http://localhost:8081/api/colors/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      setMessage('Configuration supprimée avec succès !');
      fetchColors();
      if (loadTranslations) {
        await loadTranslations();
      }
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setMessage('Erreur lors de la suppression.');
      console.error(err);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage('');
    
    const statusVal = selectedStatus === 'custom' ? customStatus.trim().toLowerCase() : selectedStatus;
    if (!statusVal) {
      setMessage('Le code du statut ne peut pas être vide.');
      return;
    }

    try {
      const payload = {
        status: statusVal,
        color: selectedColor,
        translation: selectedTranslation,
      };
      if (editingId) {
        payload.id = editingId;
      }

      const payloadTranslation = {
        langCode: 'mg',
        translationKey: statusVal,
        value: selectedTranslation,
      };

      const response = await fetch('http://localhost:8081/api/colors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseTranslation = await fetch('http://localhost:8081/api/translations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payloadTranslation),
      });

      if (!response.ok || !responseTranslation.ok) throw new Error('Failed to save configuration');
      setMessage(editingId ? 'Configuration mise à jour avec succès !' : 'Configuration créée avec succès !');
      resetForm();
      fetchColors();
      if (loadTranslations) {
        await loadTranslations();
      }
    } catch (err) {
      setMessage("Erreur lors de l'enregistrement de la configuration.");
      console.error(err);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <H1>Gestion des Couleurs des Statuts</H1>
          <P className="text-gray-500">Personnalisez les couleurs de fond des colonnes du Kanban et les noms en malgache.</P>
        </div>
        <button
          onClick={() => navigate('/backoffice')}
          className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-lg text-sm font-semibold transition cursor-pointer"
        >
          Retour Administration
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-6">
        {/* Form */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-5 h-fit">
          <h2 className="text-lg font-bold text-gray-800">
            {editingId ? 'Modifier la configuration' : 'Ajouter une configuration'}
          </h2>
          
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Statut cible</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-400"
              >
                <option value="nouveau">Nouveau</option>
                <option value="in_progress">En cours / In progress</option>
                <option value="termine">Terminé / Clos</option>
                <option value="custom">Autre statut...</option>
              </select>
            </div>

            {selectedStatus === 'custom' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Code du statut (ex: en_attente)</label>
                <input
                  type="text"
                  value={customStatus}
                  onChange={(e) => setCustomStatus(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-400"
                  placeholder="Code unique en minuscules"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Version en malgache du statut</label>
              <input
                type="text"
                value={selectedTranslation}
                onChange={(e) => setSelectedTranslation(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-400"
                placeholder="Ex: Vaovao, Efa manao, Vita..."
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Code couleur hexadécimal</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-neutral-400 font-mono"
                  placeholder="#ffffff"
                  required
                />
                <input
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="w-10 h-10 border border-gray-200 rounded-lg cursor-pointer p-0.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Raccourcis de couleurs</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((preset) => (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => setSelectedColor(preset.hex)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-100 rounded-lg text-xs font-medium hover:bg-gray-50 transition cursor-pointer"
                  >
                    <span className="w-3.5 h-3.5 rounded-full border border-gray-200" style={{ backgroundColor: preset.hex }} />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {message && (
              <p className={`text-xs font-semibold ${message.includes('succès') ? 'text-green-600' : 'text-red-500'}`}>
                {message}
              </p>
            )}

            <div className="flex flex-col gap-2 mt-2">
              <button
                type="submit"
                className="w-full bg-black text-white hover:bg-neutral-800 font-semibold text-sm py-2.5 rounded-lg transition cursor-pointer"
              >
                {editingId ? 'Enregistrer les modifications' : 'Ajouter la configuration'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-sm py-2.5 rounded-lg transition cursor-pointer"
                >
                  Annuler la modification
                </button>
              )}
            </div>
          </form>
        </div>

        {/* List */}
        <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-gray-100 shadow-sm flex flex-col gap-4">
          <h2 className="text-lg font-bold text-gray-800">Configurations actives</h2>

          {loading ? (
            <p className="text-sm text-gray-400 italic">Chargement des configurations...</p>
          ) : colors.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Aucune configuration trouvée.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-500">
                <thead className="text-xs uppercase bg-gray-50 text-gray-400 font-semibold">
                  <tr>
                    <th className="px-4 py-3">Statut (Standard)</th>
                    <th className="px-4 py-3">Nom Malgache</th>
                    <th className="px-4 py-3">Couleur</th>
                    <th className="px-4 py-3">Aperçu</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {colors.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-700">
                        {statusLabels[c.status] || c.status}
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {c.translation || '-'}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-600">{c.color}</td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-block w-8 h-8 rounded-full border border-gray-200 shadow-sm"
                          style={{ backgroundColor: c.color }}
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(c)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded transition cursor-pointer"
                          >
                            Modifier
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 rounded transition cursor-pointer"
                          >
                            Supprimer
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
