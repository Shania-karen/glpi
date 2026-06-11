import { useState, useMemo, useEffect } from 'react';
import { Card, Input, Select, Badge, Spinner, H2 } from '../../components/templates';
import { getElements } from '../../services/dashboard';
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
  return 'Standard';
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
  return item._itemtype || 'Équipement';
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
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [docId]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-100 text-neutral-400 text-xs italic">
        Erreur lien
      </div>
    );
  }
  if (!src) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-neutral-50 text-neutral-400 text-xs italic">
        <Spinner size="sm" />
      </div>
    );
  }
  return <img src={src} alt={alt || "Aperçu"} className={className} onError={onError} />;
}

function ItemImage({ item }) {
  const doc = item._documents && item._documents.find(d => d && d.filepath);
  const docId = doc ? doc.id : null;
  const imageUrl = item.picture_url || item.image || item.picture;

  if (docId) {
    return (
      <GlpiDocumentImage
        docId={docId}
        className="w-full h-48 object-cover rounded-t-xl"
      />
    );
  }

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        className="w-full h-48 object-cover rounded-t-xl"
        onError={(e) => { e.target.style.display = 'none'; }}
      />
    );
  }

  const type = (item._itemtype || '').toLowerCase();
  
  let gradient = 'from-neutral-100 to-neutral-200 text-neutral-500';
  let icon = (
    <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21m0 0-.766-1.915a1.125 1.125 0 0 1 .115-1.111l1.545-2.072m-2.223 5.098L5 15.25m9.813 0.654 3.578-3.578a1.125 1.125 0 0 0-1.59-1.59L13.25 14.31m1.563 2.248L21 15.25M13.25 14.31 9.813 15.904m0 0L8.736 10.5M13.25 14.31l1.077-5.4M8.736 10.5l-3.486-.871a1.125 1.125 0 0 1-.77-1.39l.812-3.245a1.125 1.125 0 0 1 1.39-.77l3.245.812a1.125 1.125 0 0 1 .77 1.39l-.812 3.245a1.125 1.125 0 0 1-1.39.77L8.736 10.5Zm5.591-1.59 3.486.871a1.125 1.125 0 0 1 .77 1.39l-.812 3.245a1.125 1.125 0 0 1-1.39.77l-3.245-.812a1.125 1.125 0 0 1-.77-1.39l.812-3.245a1.125 1.125 0 0 1 1.39-.77l3.245.812Z" />
    </svg>
  );

  if (type.includes('computer') || type.includes('ordinateur')) {
    gradient = 'from-blue-500 to-indigo-600 text-white';
    icon = (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25" />
      </svg>
    );
  } else if (type.includes('monitor') || type.includes('moniteur') || type.includes('ecran')) {
    gradient = 'from-teal-400 to-cyan-600 text-white';
    icon = (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h14.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z" />
      </svg>
    );
  } else if (type.includes('phone') || type.includes('téléphone') || type.includes('telephone')) {
    gradient = 'from-emerald-400 to-teal-600 text-white';
    icon = (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
      </svg>
    );
  } else if (type.includes('printer') || type.includes('imprimante')) {
    gradient = 'from-slate-400 to-slate-600 text-white';
    icon = (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0 1 10.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096a42.42 42.42 0 0 0-10.56 0m10.56 0L17.66 18m0 0a2.25 2.25 0 0 1-2.24 2.153H8.58a2.25 2.25 0 0 1-2.24-2.153m11.32 0h1.86c.621 0 1.125-.504 1.125-1.125V9.75c0-.621-.504-1.125-1.125-1.125h-16.5c-.621 0-1.125.504-1.125 1.125v7.125c0 .621.504 1.125 1.125 1.125h1.86M9 10.125V5.625c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125v4.5m-6 0h6" />
      </svg>
    );
  } else if (type.includes('network') || type.includes('réseau') || type.includes('reseau')) {
    gradient = 'from-purple-500 to-indigo-700 text-white';
    icon = (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21M8.25 7.5h7.5a.75.75 0 0 1 .75.75v7.5a.75.75 0 0 1-.75.75h-7.5a.75.75 0 0 1-.75-.75V8.25a.75.75 0 0 1 .75-.75Z" />
      </svg>
    );
  } else if (type.includes('ups') || type.includes('onduleur') || type.includes('uninterruptiblepowersupply')) {
    gradient = 'from-amber-400 to-orange-600 text-white';
    icon = (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="m3.75 13.5 10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75Z" />
      </svg>
    );
  } else if (type.includes('software') || type.includes('logiciel') || type.includes('license')) {
    gradient = 'from-rose-500 to-red-600 text-white';
    icon = (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
      </svg>
    );
  } else if (type.includes('database') || type.includes('base de données') || type.includes('base de donnees')) {
    gradient = 'from-violet-500 to-purple-600 text-white';
    icon = (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V10.125" />
      </svg>
    );
  } else if (type.includes('peripheral') || type.includes('périphérique') || type.includes('peripherique')) {
    gradient = 'from-pink-400 to-rose-600 text-white';
    icon = (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21H3.75A2.25 2.25 0 0 1 1.5 18.75V5.25A2.25 2.25 0 0 1 3.75 3h16.5a2.25 2.25 0 0 1 2.25 2.25v6.75a2.25 2.25 0 0 1-2.25 2.25h-1.5m-6 3.75v3M10.5 21H18m-7.5 0V15h7.5v6" />
      </svg>
    );
  } else if (type.includes('rack') || type.includes('baie') || type.includes('enclosure') || type.includes('châssis')) {
    gradient = 'from-neutral-600 to-neutral-800 text-white';
    icon = (
      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 1 0 0 6h13.5a3 3 0 1 0 0-6m-16.5-3a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3m-19.5 0v-6a3 3 0 0 1 3-3h13.5a3 3 0 0 1 3 3v6M1.5 7.5h21M1.5 13.5h21" />
      </svg>
    );
  }

  return (
    <div className={`w-full h-48 bg-gradient-to-br ${gradient} flex items-center justify-center rounded-t-xl relative overflow-hidden group`}>
      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="transform group-hover:scale-110 transition-transform duration-300 ease-out">
        {icon}
      </div>
    </div>
  );
}

export default function AssetList() {
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [locationId, setLocationId] = useState('');
  const [ stateId, setStateId ]= useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getElements();
        setGroups(data);
      } catch (error) {
        console.error('Erreur lors de la récupération:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Aplatir tous les items individuels depuis chaque groupe
  const allItems = useMemo(() => {
    return groups.flatMap((group) =>
      (group.allItems || []).map((item) => ({
        ...item,
        _itemtype: group.itemtype || group.itemName || 'Computer',
      }))
    );
  }, [groups]);

  // Types uniques pour le filtre
  const uniqueTypes = useMemo(() => {
    const types = new Set(allItems.map((item) => item._itemtype));
    return Array.from(types).sort();
  }, [allItems]);

   const uniqueStatus = useMemo(() => {
    const names = new Set();
    allItems.forEach((item) => {
      const states = item.states_id?.name || item.status?.name || item.states_id;
      if (states) {
        const nameVal = typeof states === 'object' ? states.name : String(states);
        if (nameVal) names.add(nameVal);
      }
    });
    return Array.from(names).sort();
  }, [allItems]);
  
  const uniqueSalle = useMemo(() => {
    const names = new Set();
    allItems.forEach((item) => {
      const loc = item.locations_id?.name || item.location?.name || item.locations_id;
      if (loc) {
        const nameVal = typeof loc === 'object' ? loc.name : String(loc);
        if (nameVal) names.add(nameVal);
      }
    });
    return Array.from(names).sort();
  }, [allItems]);

  const filteredItems = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return allItems.filter((item) => {
      const name = (item.name || '').toLowerCase();
      const id = String(item.id || '');
      const serial = (item.serial || '').toLowerCase();
      const otherserial = (item.otherserial || '').toLowerCase();

      const matchesSearch =
        !term ||
        name.includes(term) ||
        id.includes(term) ||
        serial.includes(term) ||
        otherserial.includes(term);

      const matchesType = !typeFilter || item._itemtype === typeFilter;

      const itemLoc = item.locations_id?.name || item.location?.name || item.locations_id;
      const itemLocStr = itemLoc && typeof itemLoc === 'object' ? itemLoc.name : String(itemLoc || '');
      const matchesLocation = !locationId || itemLocStr === locationId;

      const itemState=  item.states_id?.name || item.status?.name || item.states_id;
      const itemStateStr= itemState && typeof itemState === 'object' ? itemState.name : String(itemState || '');
      const matchesStates = !stateId || itemStateStr === stateId;

      return matchesSearch && matchesType && matchesLocation && matchesStates;
    });
  }, [allItems, searchTerm, typeFilter, locationId,stateId]);

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <Spinner label="Chargement de vos éléments..." />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <H2>Liste des Éléments</H2>
          <p className="text-neutral-500 text-sm mt-1">
            {allItems.length} équipement(s) au total — recherche par nom, ID, numéro de série ou type.
          </p>
        </div>
        <Badge variant="outline">{filteredItems.length} résultat(s)</Badge>
      </div>

      {/* Barre de recherche */}
      <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <Input
            type="text"
            placeholder="Rechercher par nom, ID, numéro de série…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
         <div className="w-full md:w-64">
          <Select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">Toutes les locations</option>
            {uniqueSalle.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </Select>
        </div>
        <div className="w-full md:w-64">
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="">Tous les types</option>
            {uniqueTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </div>
         <div className="w-full md:w-64">
          <Select value={stateId} onChange={(e) => setStateId(e.target.value)}>
            <option value="">tous les status</option>
            {uniqueStatus.map((states) => (
              <option key={states} value={states}>
                {states}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Grille de Cartes */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredItems.map((item, idx) => {
            const modelName = getModelName(item);
            const typeName = getTypeName(item);
            const status = item.states_id?.name || item.status?.name || item.states_id;
            const location = item.locations_id?.name || item.location?.name || item.locations_id;

            return (
              <Card key={`${item._itemtype}-${item.id ?? idx}`} hoverable className="flex flex-col h-full overflow-hidden">
                {/* Image / Fallback */}
                <ItemImage item={item} />
                
                <Card.Body className="flex-1 flex flex-col justify-between p-5">
                  <div className="space-y-3">
                    {/* Badge Type */}
                    <div className="flex justify-between items-start">
                      <Badge variant="outline" className="text-xs uppercase font-semibold tracking-wider">
                        {typeName}
                      </Badge>
                      {item.id && (
                        <span className="text-xs text-neutral-400 font-mono">ID: {item.id}</span>
                      )}
                    </div>

                    {/* Nom de l'élément */}
                    <div>
                      <h3 className="font-bold text-lg text-neutral-900 line-clamp-1 group hover:text-black transition-colors" title={item.name}>
                        {item.name || 'Sans nom'}
                      </h3>
                      {(item.serial || item.otherserial) && (
                        <p className="text-xs text-neutral-500 font-mono mt-0.5" title="Numéro de série">
                          S/N: {item.serial || item.otherserial}
                        </p>
                      )}
                    </div>

                    {/* Modèle */}
                    <div className="pt-2 border-t border-neutral-100 space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-neutral-400">Modèle:</span>
                        <span className="font-medium text-neutral-700 text-right line-clamp-1">{modelName}</span>
                      </div>
                      {location && (
                        <div className="flex justify-between text-xs">
                          <span className="text-neutral-400">Localisation:</span>
                          <span className="font-medium text-neutral-700 text-right line-clamp-1">{location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Statut Badge */}
                  {status && (
                    <div className="mt-4 pt-3 border-t border-neutral-100 flex justify-end">
                      <Badge variant="info" className="text-xs">
                        {status}
                      </Badge>
                    </div>
                  )}
                </Card.Body>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl p-12 text-center text-neutral-400 italic">
          Aucun équipement ne correspond à votre recherche.
        </div>
      )}
    </div>
  );
}
