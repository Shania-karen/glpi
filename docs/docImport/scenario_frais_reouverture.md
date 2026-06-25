Todo : Ajouter frais fixes lors réouverture

La consigne : "Lors de la réouverture d'un ticket, en plus du coût calculé par le pourcentage, on ajoute des frais de dossier fixes (par exemple 15€) répartis équitablement sur chaque équipement concerné par la réouverture."

Étape 1 : Ajouter les frais fixes dans le Mode 1 (Dernier Supercout) de `coutWorkflowService.js`
(deskflow/src/services/coutWorkflowService.js)
On calcule les frais fixes par équipement et on les ajoute au coût de réouverture.

```javascript
// ...
export async function reopenTicketWithCosts(ticketId, percentage, options = {}) {
  const { updateGLPIStatus = true } = options;
  const createdIds = [];

  const latestGroup = await getLatestGroupCouts(ticketId, 'Supercout');
  if (!latestGroup || latestGroup.length === 0) {
    throw new Error(`Aucun Supercout trouvé pour le ticket #${ticketId}`);
  }
  const grp = Date.now();

  // --- AJOUTER ICI : ---
  const fraisFixes = 15; // Frais fixes de réouverture
  const fraisParItem = parseFloat((fraisFixes / latestGroup.length).toFixed(2));
  // ---------------------

  for (const entry of latestGroup) {
    // --- MODIFIER ICI : ---
    const coutBase = parseFloat(((entry.cout * percentage) / 100).toFixed(2));
    const coutReouv = coutBase + fraisParItem;
    // ---------------------
    const res = await createCout({
      idTicket: ticketId,
// ...
```

Étape 2 : Ajouter les frais fixes dans le Mode 2 (Premier Supercout) de `coutWorkflowService.js`
(deskflow/src/services/coutWorkflowService.js)
On applique la même logique de frais fixes répartis pour le premier Supercout.

```javascript
// ...
export async function reopenTicketWithCostsModeTwo(ticketId, percentage, options = {}) {
  const { updateGLPIStatus = true } = options;
  const createdIds = [];

  const firstGroup = await getFirstGroupCouts(ticketId, 'Supercout');
  if (!firstGroup || firstGroup.length === 0) {
    throw new Error(`Aucun Supercout trouvé pour le ticket #${ticketId}`);
  }
  const grp = Date.now();

  // --- AJOUTER ICI : ---
  const fraisFixes = 15; // Frais fixes de réouverture
  const fraisParItem = parseFloat((fraisFixes / firstGroup.length).toFixed(2));
  // ---------------------

  for (const entry of firstGroup) {
    // --- MODIFIER ICI : ---
    const coutBase = parseFloat(((entry.cout * percentage) / 100).toFixed(2));
    const coutReouv = coutBase + fraisParItem;
    // ---------------------
    const res = await createCout({
      idTicket: ticketId,
// ...
```

Étape 3 : Ajouter les frais fixes dans le Mode 3 (Moyenne des Supercouts) de `coutWorkflowService.js`
(deskflow/src/services/coutWorkflowService.js)
On applique la logique sur le calcul de la moyenne.

```javascript
// ...
export async function reopenTicketWithCostsModeThree(ticketId, percentage, options = {}) {
   const { updateGLPIStatus = true } = options;
  const createdIds = [];
   const average = await getAverageCout(ticketId, 'Supercout');

  const latestGroup = await getLatestGroupCouts(ticketId, 'Supercout');
  if (!latestGroup || latestGroup.length === 0) {
    throw new Error(`Aucun Supercout trouvé pour le ticket #${ticketId}`);
  }
  const grp = Date.now();

  // --- AJOUTER ICI : ---
  const fraisFixes = 15; // Frais fixes de réouverture
  const fraisParItem = parseFloat((fraisFixes / latestGroup.length).toFixed(2));
  // ---------------------

  // Proratiser la moyenne globale par le nombre d'items du dernier groupe
  const averageParItem = average / latestGroup.length;
  for (const entry of latestGroup) {
    // --- MODIFIER ICI : ---
    const coutBase = parseFloat(((averageParItem * percentage) / 100).toFixed(2));
    const coutReouv = coutBase + fraisParItem;
    // ---------------------
    const res = await createCout({
      idTicket: ticketId,
// ...
```

Étape 4 : Ajouter les frais fixes dans le Mode 4 (Somme des Supercouts) de `coutWorkflowService.js`
(deskflow/src/services/coutWorkflowService.js)
On applique la logique sur la somme globale de réouverture.

```javascript
// ...
export async function reopenTicketWithCostsModeFour(ticketId, percentage, options = {}) {
  const { updateGLPIStatus = true } = options;
  const createdIds = [];
   const sum = await getSumCout(ticketId, 'Supercout');

  const latestGroup = await getLatestGroupCouts(ticketId, 'Supercout');
  if (!latestGroup || latestGroup.length === 0) {
    throw new Error(`Aucun Supercout trouvé pour le ticket #${ticketId}`);
  }
  const grp = Date.now();

  // --- AJOUTER ICI : ---
  const fraisFixes = 15; // Frais fixes de réouverture
  const fraisParItem = parseFloat((fraisFixes / latestGroup.length).toFixed(2));
  // ---------------------

  // Proratiser la somme globale par le nombre d'items du dernier groupe
  const sumParItem = sum / latestGroup.length;
  for (const entry of latestGroup) {
    // --- MODIFIER ICI : ---
    const coutBase = parseFloat(((sumParItem * percentage) / 100).toFixed(2));
    const coutReouv = coutBase + fraisParItem;
    // ---------------------
    const res = await createCout({
      idTicket: ticketId,
// ...
```

Étape 5 : Mettre à jour l'explication textuelle dans la modale de réouverture
(deskflow/src/components/ticket/TicketApprovalFormModal.jsx)
On modifie le texte explicatif affiché à l'utilisateur pour indiquer les frais fixes.

```javascript
// ...
          {/* ── ÉTAPE 2 : Formulaire % de réouverture ── */}
          {step === STEP_FORM && (
            <form className="space-y-4 pt-3 border-t border-neutral-100" onSubmit={handleReouverture}>
              <p className="text-neutral-600">
                Saisissez le <strong>pourcentage du coût</strong> à facturer pour cette réouverture.
                <br />
                <span className="text-xs text-neutral-400">
                  {/* --- MODIFIER ICI : --- */}
                  Coût réouverture = (SuperCout × % / 100) + 15€ (frais fixes)
                  {/* --------------------- */}
                  &nbsp;— le SuperCout utilisé est le dernier enregistré (MAX timestamp).
                </span>
              </p>
              <div>
// ...
```

🧪 CHECKPOINT TEST : Réouvrez un ticket depuis le Kanban en sélectionnant un mode et en indiquant un pourcentage (ex: 10%). Vérifiez ensuite dans l'historique ou le détail des coûts que la somme enregistrée correspond bien au pourcentage + 15€ (ou divisé par le nombre d'équipements s'il y en a plusieurs).
