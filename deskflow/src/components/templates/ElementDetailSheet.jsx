import { useState, useEffect } from 'react';
import { fetchDataAPIRest } from '../../services/apiClient';
import { Badge, Button } from './index';

// Helper pour extraire les valeurs des objets GLPI
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

// Extrait le nom du modèle
const getModelName = (item) => {
  if (!item) return '-';
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

// Extrait le type
const getTypeName = (item) => {
  if (!item) return '-';
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
  return item._itemtype || '-';
};

// Récupération asynchrone des documents GLPI
function GlpiDocumentImage({ docId, className }) {
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
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docId]);

  if (error) {
    return (
      <div className={`${className} bg-neutral-100 flex items-center justify-center text-neutral-400`}>
        <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
        </svg>
      </div>
    );
  }

  if (!src) {
    return (
      <div className={`${className} bg-neutral-50 flex items-center justify-center`}>
        <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return <img src={src} className={className} alt="Document GLPI" />;
}

// Rendu conditionnel de l'image de l'équipement avec fallbacks
function ItemImage({ item }) {
  const doc = item._documents && item._documents.find(d => d && d.filepath);
  const docId = doc ? doc.id : null;
  const imageUrl = item.picture_url || item.image || item.picture;

  if (docId) {
    return <GlpiDocumentImage docId={docId} className="w-full h-64 object-cover rounded-xl border border-neutral-200" />;
  }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        className="w-full h-64 object-cover rounded-xl border border-neutral-200"
        onError={(e) => { e.target.style.display = 'none'; }}
        alt={item.name}
      />
    );
  }

  const type = (item._itemtype || '').toLowerCase();
  let gradient = 'from-neutral-100 to-neutral-200 text-neutral-500';
  let icon = (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21m0 0-.766-1.915a1.125 1.125 0 0 1 .115-1.111l1.545-2.072m-2.223 5.098L5 15.25m9.813 0.654 3.578-3.578a1.125 1.125 0 0 0-1.59-1.59L13.25 14.31m1.563 2.248L21 15.25M13.25 14.31 9.813 15.904m0 0L8.736 10.5M13.25 14.31l1.077-5.4M8.736 10.5l-3.486-.871a1.125 1.125 0 0 1-.77-1.39l.812-3.245a1.125 1.125 0 0 1 1.39-.77l3.245.812a1.125 1.125 0 0 1 .77 1.39l-.812 3.245a1.125 1.125 0 0 1-1.39.77L8.736 10.5Zm5.591-1.59 3.486.871a1.125 1.125 0 0 1 .77 1.39l-.812 3.245a1.125 1.125 0 0 1-1.39.77l-3.245-.812a1.125 1.125 0 0 1-.77-1.39l.812-3.245a1.125 1.125 0 0 1 1.39-.77l3.245.812Z" />
    </svg>
  );

  if (type.includes('computer') || type.includes('ordinateur')) {
    gradient = 'from-blue-500 to-indigo-600 text-white';
    icon = (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
      </svg>
    );
  } else if (type.includes('monitor') || type.includes('moniteur') || type.includes('ecran')) {
    gradient = 'from-teal-400 to-cyan-600 text-white';
    icon = (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h14.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    );
  } else if (type.includes('phone') || type.includes('téléphone') || type.includes('telephone')) {
    gradient = 'from-emerald-400 to-teal-600 text-white';
    icon = (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    );
  } else if (type.includes('printer') || type.includes('imprimante')) {
    gradient = 'from-slate-400 to-slate-600 text-white';
    icon = (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096a42.42 42.42 0 0 0-10.56 0m10.56 0L17.66 18m0 0a2.25 2.25 0 0 1-2.24 2.153H8.58a2.25 2.25 0 0 1-2.24-2.153m11.32 0h1.86c.621 0 1.125-.504 1.125-1.125V9.75c0-.621-.504-1.125-1.125-1.125h-16.5c-.621 0-1.125.504-1.125 1.125v7.125c0 .621.504 1.125 1.125 1.125h1.86M9 10.125V5.625c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v4.5m-6 0h6" />
      </svg>
    );
  } else if (type.includes('ups') || type.includes('onduleur') || type.includes('uninterruptiblepowersupply')) {
    gradient = 'from-amber-400 to-orange-600 text-white';
    icon = (
      <svg className="w-16 h-16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    );
  }

  return (
    <div className={`w-full h-64 bg-gradient-to-br ${gradient} flex items-center justify-center rounded-xl border border-neutral-200 relative overflow-hidden`}>
      <div className="transform scale-110">
        {icon}
      </div>
    </div>
  );
}

export default function ElementDetailSheet({ item, onClose }) {
  if (!item) return null;

  const statusName = extractValue(item.states_id) || 'Actif';
  const locationName = extractValue(item.locations_id) || '-';
  const manufacturerName = extractValue(item.manufacturers_id) || '-';
  const assignedUser = extractValue(item.users_id) || 'Non assigné';

  return (
    <div className="bg-white border border-neutral-200 rounded-2xl shadow-lg max-w-4xl w-full overflow-hidden mx-auto my-4 text-black font-sans">
      {/* Header */}
      <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50">
        <div>
          <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest">{getTypeName(item)}</span>
          <h2 className="text-xl font-bold text-neutral-900 mt-0.5">{item.name || 'Équipement sans nom'}</h2>
        </div>
        {onClose && (
          <button 
            onClick={onClose} 
            className="text-neutral-400 hover:text-black transition-colors p-1.5 hover:bg-neutral-100 rounded-lg cursor-pointer"
            aria-label="Fermer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Side: Media & Status */}
        <div className="flex flex-col gap-4">
          <ItemImage item={item} />
          
          <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl border border-neutral-100">
            <span className="text-sm text-neutral-500 font-medium">Statut de l'équipement</span>
            <Badge variant={statusName.toLowerCase().includes('panne') ? 'danger' : statusName.toLowerCase().includes('stock') ? 'warning' : 'success'}>
              {statusName}
            </Badge>
          </div>
        </div>

        {/* Right Side: Metadata grid */}
        <div className="flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">Caractéristiques</h3>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-sm border-t border-neutral-100 pt-4">
              <div>
                <span className="text-xs text-neutral-400 font-semibold block">Constructeur</span>
                <span className="font-medium text-neutral-800">{manufacturerName}</span>
              </div>
              <div>
                <span className="text-xs text-neutral-400 font-semibold block">Modèle</span>
                <span className="font-medium text-neutral-800">{getModelName(item)}</span>
              </div>
              
              <div className="col-span-2 border-t border-neutral-50 pt-3">
                <span className="text-xs text-neutral-400 font-semibold block">Numéro de Série / Inventaire</span>
                <span className="font-mono text-neutral-800">{item.serial || item.otherserial || '-'}</span>
              </div>

              <div className="col-span-2 border-t border-neutral-50 pt-3">
                <span className="text-xs text-neutral-400 font-semibold block">Emplacement</span>
                <span className="font-medium text-neutral-800">{locationName}</span>
              </div>

              <div className="col-span-2 border-t border-neutral-50 pt-3">
                <span className="text-xs text-neutral-400 font-semibold block">Utilisateur Assigné</span>
                <span className="font-medium text-neutral-800">{assignedUser}</span>
              </div>
            </div>
          </div>

          {/* Footer inside Right column */}
          <div className="mt-8 border-t border-neutral-100 pt-4 flex justify-end gap-3">
            {onClose && (
              <Button variant="secondary" onClick={onClose}>
                Fermer
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
