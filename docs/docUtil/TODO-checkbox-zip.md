# Guide d'implémentation : Import d'images ZIP conditionnel avec Checkbox

Ce guide détaille les étapes nécessaires pour ajouter une case à cocher (Checkbox) dans la page d'import. Si la case est cochée, le champ de dépôt du fichier `ZIP` s'affiche et l'import d'images est actif. Si elle est décochée, le champ de dépôt du `ZIP` disparaît et le pipeline d'import s'exécute sans images.

---

## Étape 1 : Ajouter le State et le sélecteur dans `Import.jsx`

Modifiez le fichier `deskflow/src/pages/backoffice/Import.jsx` pour introduire un nouvel état booléen `withImages` (initialisé à `false` ou `true` selon vos préférences).

Dans le composant `Import()`, localisez les déclarations d'états (vers la ligne 85) et ajoutez `withImages` :

```javascript
// deskflow/src/pages/backoffice/Import.jsx

export default function Import() {
  const navigate = useNavigate();

  const [files, setFiles] = useState({ csv1: null, csv2: null, csv3: null, zip: null });
  const [phase, setPhase] = useState('IDLE');
  const [logs, setLogs] = useState([]);
  const [validationErrors, setValidationErrors] = useState([]);
  const [importResult, setImportResult] = useState(null);
  
  // 🟢 NOUVEAU : État pour activer/désactiver l'import d'images
  const [withImages, setWithImages] = useState(false);
```

---

## Étape 2 : Adapter la logique de réinitialisation

Dans la fonction `handleReset` (vers la ligne 145), réinitialisez également cet état si nécessaire :

```javascript
  const handleReset = () => {
    setFiles({ csv1: null, csv2: null, csv3: null, zip: null });
    setPhase('IDLE');
    setLogs([]);
    setValidationErrors([]);
    setImportResult(null);
    setWithImages(false); // 🟢 NOUVEAU : Réinitialise à faux
  };
```

---

## Étape 3 : Mettre à jour l'appel à `phase1_extract`

Modifiez la fonction de lancement de l'import `handleLaunchImport` pour passer `null` à la place de `files.zip` si l'option est désactivée :

```javascript
  const handleLaunchImport = async () => {
    setLogs([]);
    setValidationErrors([]);
    setImportResult(null);
    try {
      setPhase('PARSING');
      addLog('📂 Phase 1 : Extraction et nettoyage...');
      
      // 🟢 MODIFICATION : Si withImages est faux, on envoie null à la place du fichier ZIP
      const zipToSend = withImages ? files.zip : null;
      
      const { equipements, tickets, couts, images } = await phase1_extract(
        files.csv1, files.csv2, files.csv3, zipToSend
      );
      
      addLog(`  → ${equipements.length} équipement(s), ${tickets.length} ticket(s), ${couts.length} coût(s), ${Object.keys(images).length} image(s).`);
```

---

## Étape 4 : Adapter l'affichage dans le formulaire (HTML / JSX)

Dans la partie retournée par le composant `Import` (vers la ligne 174), insérez la Checkbox juste avant les inputs de fichiers, puis rendez la `DropZone` du ZIP conditionnelle (`withImages && (...)`).

```jsx
            <Card.Header>
              <H2>Fichiers à importer</H2>
            </Card.Header>
            <Card.Body>
              
              {/* 🟢 NOUVEAU : Case à cocher pour activer l'import d'images */}
              <div className="flex items-center gap-2 mb-6 p-3 bg-neutral-50 rounded-lg border border-neutral-200">
                <input
                  type="checkbox"
                  id="toggle-zip"
                  checked={withImages}
                  onChange={(e) => {
                    setWithImages(e.target.checked);
                    // Si on décoche, on vide également le fichier ZIP précédemment sélectionné
                    if (!e.target.checked) {
                      setFiles(prev => ({ ...prev, zip: null }));
                    }
                  }}
                  disabled={isRunning}
                  className="w-4 h-4 text-black border-neutral-300 rounded focus:ring-black cursor-pointer"
                />
                <label htmlFor="toggle-zip" className="text-sm font-medium text-neutral-700 cursor-pointer select-none">
                  Importer un fichier d'images (.zip) pour les équipements
                </label>
              </div>

              <DropZone
                label="Feuille 1 — Équipements"
                info="Name, Status, Location, Manufacturer, Item_Type, Model, Inventory_Number, User"
                accept=".csv"
                file={files.csv1}
                onChange={handleFileChange('csv1')}
                onDrop={handleDrop('csv1')}
                disabled={isRunning}
              />
              
              <DropZone
                label="Feuille 2 — Tickets"
                info="Ref_Ticket, Date, Heure, Type, Titre, Description, Status, Priority, Items"
                accept=".csv"
                file={files.csv2}
                onChange={handleFileChange('csv2')}
                onDrop={handleDrop('csv2')}
                disabled={isRunning}
              />
              
              <DropZone
                label="Feuille 3 — Coûts et Tâches"
                info="Num_Ticket, Duration_second, Time_Cost, Fixed_Cost"
                accept=".csv"
                file={files.csv3}
                onChange={handleFileChange('csv3')}
                onDrop={handleDrop('csv3')}
                disabled={isRunning}
              />

              {/* 🟢 NOUVEAU : Rendu conditionnel du DropZone ZIP */}
              {withImages && (
                <div className="animate-fadeIn">
                  <DropZone
                    label="Images (.zip)"
                    info="Nommage : NomÉquipement.png / .jpeg — ex : PC-ADM-001.png"
                    accept=".zip"
                    file={files.zip}
                    onChange={handleFileChange('zip')}
                    onDrop={handleDrop('zip')}
                    disabled={isRunning}
                  />
                </div>
              )}

            </Card.Body>
```

---

## Étape 5 : Rendre le ZIP obligatoire dans la validation SI la case est cochée (Optionnel)

Si vous voulez forcer l'utilisateur à fournir le ZIP *uniquement* lorsque la checkbox est cochée, modifiez la validation de la ligne 104 :

```javascript
  // 🟢 MODIFICATION : Si withImages est coché, files.zip doit être présent, sinon seuls les 3 CSV suffisent.
  const allFilesLoaded = files.csv1 && 
                         files.csv2 && 
                         files.csv3 && 
                         (!withImages || files.zip);
```

---

### Pourquoi cette approche est robuste ?
1. **Zéro crash** : Grâce aux modifications déjà faites sur le backend (`importService.js`), si `zipFile` vaut `null`, le pipeline s'exécute sans images de manière fluide.
2. **Exclusion propre** : Décocher la case vide automatiquement l'état `files.zip`, garantissant qu'aucune image résiduelle ne sera envoyée par erreur.
3. **Transition fluide** : L'ajout d'une classe d'animation comme `animate-fadeIn` rend l'apparition/disparition visuellement agréable.
