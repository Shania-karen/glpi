import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  H1, H2, Card, Button, Badge, Alert, Spinner,Select
} from '../../components/templates';
import { ImportIcon } from '../../components/templates/Icon';
import { processTicketImport } from '../../services/importSqlite';

function DropZone({ label, info, accept, file, onChange, onDrop, disabled }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  

  return (
    <div className="mb-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500 mb-2">
        {label}
      </p>
           
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { setDragOver(false); if (!disabled) onDrop(e); }}
        className={[
          'flex items-center justify-center min-h-[60px] rounded-lg border-2 border-dashed transition-all cursor-pointer px-4 py-3',
          dragOver ? 'border-black bg-neutral-100' : 'border-neutral-300',
          file ? 'border-emerald-500 bg-emerald-50 border-solid' : '',
          disabled ? 'opacity-40 pointer-events-none' : '',
        ].join(' ')}
      >
        {file ? (
          <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {file.name}
            <span className="text-neutral-400 font-normal">({(file.size / 1024).toFixed(1)} KB)</span>
          </span>
        ) : (
          <span className="text-sm text-neutral-400 text-center">
            Glisser-déposer ou{' '}
            <span className="text-black underline font-medium">parcourir</span>
          </span>
        )}
      </div>
      {info && (
        <p className="mt-1 text-xs text-neutral-400">{info}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}

function StatusBadge({ phase }) {
  const map = {
    IDLE:      { label: 'En attente',    variant: 'outline' },
    PARSING:   { label: 'Parsing…',      variant: 'warning' },
    DRY_RUN:   { label: 'Validation…',   variant: 'warning' },
    ERRORS:    { label: 'Erreurs CSV',   variant: 'danger'  },
    IMPORTING: { label: 'Import…',       variant: 'dark'    },
    SUCCESS:   { label: '✓ Succès',      variant: 'success' },
    FAILED:    { label: 'Rollback OK',   variant: 'warning' },
  };
  const { label, variant } = map[phase] || map.IDLE;
  return <Badge variant={variant}>{label}</Badge>;
}
function SummaryItem({ label, count }) {
  return (
    <div className="flex flex-col items-center border border-neutral-200 rounded-lg p-4">
      <span className="text-2xl font-bold text-black">{count}</span>
      <span className="text-xs text-neutral-500 mt-1">{label}</span>
    </div>
  );
}

export default function Import() {
  const navigate = useNavigate();

  const [files, setFiles] = useState({ csv1: null, csv2: null, csv3: null, zip: null });
  const [phase, setPhase] = useState('IDLE');
  const [logs, setLogs] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const logsEndRef = useRef(null);
  const [mvt , setMvt]=useState('mode 1');
    const [loading, setLoading]         = useState(true);
  const addLog = useCallback((msg) => {
    setLogs((prev) => [...prev, { id: Date.now() + Math.random(), msg, ts: new Date().toLocaleTimeString() }]);
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  const handleFileChange = (key) => (e) => {
    setFiles((prev) => ({ ...prev, [key]: e.target.files?.[0] || null }));
  };
  const handleDrop = (key) => (e) => {
    e.preventDefault();
    setFiles((prev) => ({ ...prev, [key]: e.dataTransfer.files?.[0] || null }));
  };

  const hasRequiredCsvs = files.csv1;
  const isRunning = ['PARSING', 'DRY_RUN', 'IMPORTING'].includes(phase);

  const handleLaunchImport = async () => {
    setLogs([]);
    setValidationErrors([]);
    setImportResult(null);
    try {
      setPhase('PARSING');
      addLog(' Phase 1 : Extraction et nettoyage du CSV...');
      
      setPhase('IMPORTING');
      addLog(' Phase 2 : Enregistrement des mouvements dans SQLite...');
      
      const count = await processTicketImport(files.csv1, (current, total) => {
        addLog(` Importation en cours : ${current} / ${total} lignes traitées...`);
      });
      
      setImportResult(count);
      setPhase('SUCCESS');
      addLog(` Importation terminée avec succès ! ${count} coût(s) inséré(s) dans SQLite.`);
    } catch (err) {
      setPhase('FAILED');
      addLog(` Erreur fatale : ${err.message}`);
      addLog(" Rollback exécuté. Toutes les modifications SQLite de cette session ont été annulées.");
    }
  };

  const handleReset = () => {
    setFiles({ csv1: null});
    setPhase('IDLE');
    setLogs([]);
    setValidationErrors([]);
    setImportResult(null);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/backoffice')}>
            ← Retour
          </Button>
          <div>
            <H1>Import de données GLPI</H1>
            <p className="text-sm text-neutral-500 mt-0.5">
              Importation transactionnelle — Tout ou Rien
            </p>
          </div>
        </div>
        <StatusBadge phase={phase} />
      </div>
      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="flex flex-col gap-5">
          <Card>
            <Card.Header>
              <H2>Fichiers à importer</H2>
            </Card.Header>
            
              
              <Card.Body>
              <DropZone
                info="ticket, mvt, valeur"
                accept=".csv"
                file={files.csv1}
                onChange={handleFileChange('csv1')}
                onDrop={handleDrop('csv1')}
                disabled={isRunning}
              />
            </Card.Body>
     
            <Card.Footer>
              <div className="flex gap-2 flex-wrap w-full">
                <Button
                  variant="primary"
                  disabled={!hasRequiredCsvs || isRunning}
                  onClick={handleLaunchImport}
                >
                  {isRunning ? (
                    <><Spinner size="sm" /> En cours…</>
                  ) : (
                    <><ImportIcon /> Lancer l'import</>
                  )}
                </Button>
                {['ERRORS', 'FAILED', 'SUCCESS'].includes(phase) && (
                  <Button variant="outline" onClick={handleReset}>
                    Recommencer
                  </Button>
                )}
              </div>
            </Card.Footer>
          </Card>
          <Alert>
            <strong>Règle Tout ou Rien :</strong> En cas d'erreur pendant l'import,
            un rollback automatique supprime toutes les données créées via{' '}
            <code className="text-xs bg-neutral-200 px-1 rounded">DELETE ?force_purge=true</code>.
            Les Lieux et Fabricants absents de GLPI sont créés automatiquement.
          </Alert>
        </div>

        <div className="flex flex-col gap-5">

          <Card>
            <Card.Header>
              <H2>Journal d'exécution</H2>
            </Card.Header>
            <Card.Body>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 min-h-[220px] max-h-[340px] overflow-y-auto font-mono text-xs flex flex-col gap-1">
                {logs.length === 0 ? (
                  <span className="text-neutral-400 italic">En attente du lancement…</span>
                ) : (
                  logs.map((l) => (
                    <div key={l.id} className="flex gap-3">
                      <span className="text-neutral-400 shrink-0">{l.ts}</span>
                      <span className="text-neutral-700">{l.msg}</span>
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </Card.Body>
          </Card>

          {validationErrors.length > 0 && (
            <Card>
              <Card.Header>
                <H2 className="text-red-600">
                  {validationErrors.length} Erreur(s) détectée(s)
                </H2>
              </Card.Header>
              <Card.Body>
                <p className="text-sm text-neutral-500 mb-3">
                  Corrigez ces erreurs dans vos fichiers CSV et relancez l'import.
                </p>
                <ul className="flex flex-col gap-2 max-h-[260px] overflow-y-auto">
                  {validationErrors.map((err, i) => (
                    <li key={i}>
                      <Alert className="border-red-200 bg-red-50 text-red-700 text-xs">
                        {err}
                      </Alert>
                    </li>
                  ))}
                </ul>
              </Card.Body>
            </Card>
          )}
          {phase === 'SUCCESS' && importResult !== null && (
            <Card>
              <Card.Header>
                <H2>Import réussi</H2>
                <Badge variant="success">✓ Confirmé</Badge>
              </Card.Header>
              <Card.Body>
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700">
                  Importation terminée avec succès. <strong>{importResult}</strong> coût(s) ont été créés/traités dans SQLite.
                </Alert>
              </Card.Body>
            </Card>
          )}

          {phase === 'FAILED' && (
            <Card>
              <Card.Header>
                <H2>Rollback exécuté</H2>
                <Badge variant="warning">Annulé</Badge>
              </Card.Header>
              <Card.Body>
                <Alert>
                  Toutes les données créées lors de cette session ont été purgées.
                  La base SQLite est dans son état d'origine.
                </Alert>
              </Card.Body>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
