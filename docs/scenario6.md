# Scénarios Aléatoires Possibles — GLPI Cost Management

## Ce qui existe déjà

| Alea | Fonctionnalité | Fichiers clés |
|------|---------------|---------------|
| 1 | Import CSV (close / open / cancel) | `importSqlite.js`, `ImportSqlite.jsx`, `coutWorkflowService.js` |
| 2 | 4 modes de calcul réouverture | `coutWorkflowService.js`, `CoutController.java → recalculateTicket()` |
| 3 | ListModifiable + recalcul cascade | `ListModifiable.jsx`, `coutService.js → updateCoutGroup()`, `CoutController.java → updateGroup()` |
| 4 | ListCosts agrégée par catégorie | `ListCosts.jsx`, `coutService.js → getAllCouts()` |

---

# SCÉNARIO A — Plafond de Budget par Catégorie

## Logique métier
On définit un budget maximum pour chaque catégorie (Computer / Monitor / Phone).
Si la somme Supercouts + Réouvertures dépasse ce plafond → le système bloque l'import et affiche une alerte dans ListCosts.

**Exemple :**
```
Plafond Computer = 1000 €
Cumul actuel     = 980 €
Prochain close   = 50 € → total 1030 € → BLOQUÉ
```

## Format CSV (nouvelle ligne de config)
```
ticket,mvt,valeur,mode
,plafond,1000,Computer
,plafond,500,Monitor
1,close,200,
2,open,10,3
```
> Si ticket vide + mvt = "plafond" → ligne de paramétrage, pas un mouvement.

---

## Fichiers à CRÉER

### `BudgetPlafond.java`
**Chemin :** `d:\shania\itu\L3\2\glpi\sqlite\src\main\java\com\eval\sqlite\model\`

```java
@Entity
@Table(name = "budget_plafond")
public class BudgetPlafond {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String category;  // "Computer" | "Monitor" | "Phone"
    private double plafond;
    private Long updatedAt;
    // getters / setters
}
```

### `BudgetPlafondRepository.java`
**Chemin :** `.../repository/`

```java
@Repository
public interface BudgetPlafondRepository extends JpaRepository<BudgetPlafond, Long> {
    Optional<BudgetPlafond> findByCategory(String category);
}
```

### `BudgetPlafondController.java`
**Chemin :** `.../controller/`

```java
@RestController
@RequestMapping("/api")
public class BudgetPlafondController {

    @Autowired BudgetPlafondRepository repo;
    @Autowired CoutRepository coutRepo;

    // GET /api/plafonds
    @GetMapping("/plafonds")
    public List<BudgetPlafond> getAll() { return repo.findAll(); }

    // POST /api/plafonds  → upsert
    @PostMapping("/plafonds")
    public BudgetPlafond save(@RequestBody BudgetPlafond p) {
        repo.findByCategory(p.getCategory()).ifPresent(existing -> p.setId(existing.getId()));
        p.setUpdatedAt(System.currentTimeMillis());
        return repo.save(p);
    }

    // GET /api/plafonds/check/{category}
    @GetMapping("/plafonds/check/{category}")
    public Map<String, Object> check(@PathVariable String category) {
        double total = coutRepo.findSumByCategory(category) != null
            ? coutRepo.findSumByCategory(category) : 0.0;
        double plafond = repo.findByCategory(category)
            .map(BudgetPlafond::getPlafond).orElse(Double.MAX_VALUE);
        Map<String, Object> r = new HashMap<>();
        r.put("total", total);
        r.put("plafond", plafond);
        r.put("depasse", total > plafond);
        return r;
    }
}
```

### `budgetService.js`
**Chemin :** `d:\shania\itu\L3\2\glpi\deskflow\src\services\`

```js
const SPRING_API = '/api';

export async function getAllPlafonds() {
  const res = await fetch(`${SPRING_API}/plafonds`);
  if (!res.ok) return [];
  return res.json();
}

export async function savePlafond(category, montant) {
  await fetch(`${SPRING_API}/plafonds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, plafond: montant })
  });
}

export async function checkPlafond(category) {
  const res = await fetch(`${SPRING_API}/plafonds/check/${category}`);
  if (!res.ok) return null;
  return res.json();
}
```

---

## Fichiers à MODIFIER

### `CoutRepository.java` — ajouter après ligne 32
```java
// Somme Supercouts + réouvertures pour une catégorie
@Query("SELECT SUM(c.cout) FROM Cout c WHERE c.category = :category AND c.typeCout IN ('Supercout', 'reouverture')")
Double findSumByCategory(@Param("category") String category);
```

### `importSqlite.js`

**Dans `parseCSVToCouts` (ligne ~32), ajouter avant le return normal :**
```js
// Détection ligne de type plafond
if (cleanColumns[1]?.toLowerCase() === 'plafond') {
  return { ticket: '', mvt: 'plafond', valeur: cleanColumns[2] || '0', mode: cleanColumns[3] || '' };
}
```

**Dans `processTicketImport` (ligne ~98), ajouter au début de la boucle :**
```js
// Cas ligne plafond
if (mvt === 'plafond') {
  const category = cout.mode;
  await savePlafond(category, parseFloat(val) || 0);
  continue;
}
// Vérification plafond avant close/open
// (category à récupérer via GLPI Item_Ticket du ticket concerné)
```

### `ListCosts.jsx`

**Dans `useEffect` (ligne ~14), ajouter chargement des plafonds :**
```js
const [plafonds, setPlafonds] = useState({});
// dans loadData() :
const plafondsData = await getAllPlafonds();
const map = {};
plafondsData.forEach(p => { map[p.category] = p.plafond; });
setPlafonds(map);
```

**Dans le tableau (ligne ~218), ajouter colonne Plafond :**
```jsx
<Th>Plafond</Th>
// ...
<Td>
  {plafonds[cat] != null
    ? <>{plafonds[cat]} € {totalRow > plafonds[cat] && <Badge variant="danger">⚠ DÉPASSÉ</Badge>}</>
    : '—'}
</Td>
```

### `App.jsx` — ajouter route (après ligne 41)
```jsx
import BudgetConfig from './pages/backoffice/BudgetConfig';
<Route path="backoffice/budget" element={<BudgetConfig />} />
```

---

# SCÉNARIO B — Historique des Modifications (Audit Trail)

## Logique métier
Chaque modification d'un groupe via `ListModifiable` enregistre :
- ancienne valeur → nouvelle valeur
- timestamp de modification
- champ modifié (mode / valeur / cout)

Un bouton **"Historique"** par ligne ouvre un modal avec la liste des modifs passées.

---

## Fichiers à CRÉER

### `Historique.java`
**Chemin :** `.../model/`

```java
@Entity
@Table(name = "historique")
public class Historique {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private Long   grpCout;        // le grp du cout modifié
    private Long   idTicket;
    private String typeCout;
    private String champModifie;   // "mode" | "valeur" | "cout"
    private String ancienneValeur;
    private String nouvelleValeur;
    private Long   dateModif;      // timestamp
    // getters / setters
}
```

### `HistoriqueRepository.java`
```java
@Repository
public interface HistoriqueRepository extends JpaRepository<Historique, Long> {
    List<Historique> findByGrpCoutOrderByDateModifDesc(Long grpCout);
}
```

### `HistoriqueController.java`
```java
@RestController @RequestMapping("/api")
public class HistoriqueController {
    @Autowired HistoriqueRepository repo;

    // GET /api/historique/byGrp/{grp}
    @GetMapping("/historique/byGrp/{grp}")
    public List<Historique> byGrp(@PathVariable Long grp) {
        return repo.findByGrpCoutOrderByDateModifDesc(grp);
    }
}
```

### `historiqueService.js`
```js
export async function getHistoriqueByGrp(grp) {
  const res = await fetch(`/api/historique/byGrp/${grp}`);
  if (!res.ok) return [];
  return res.json();
}
```

---

## Fichiers à MODIFIER

### `CoutController.java` — méthode `updateGroup()` (lignes 44–75)

Ajouter **avant** `coutRepository.saveAll(filtered)` :
```java
@Autowired HistoriqueRepository historiqueRepository;

// Enregistrer la modification dans l'historique
long now = System.currentTimeMillis();
if ("Supercout".equalsIgnoreCase(typeCout)) {
    double ancienTotal = filtered.stream().mapToDouble(Cout::getCout).sum();
    Historique h = new Historique();
    h.setGrpCout(grp);  h.setIdTicket(idTicket);  h.setTypeCout(typeCout);
    h.setChampModifie("cout");
    h.setAncienneValeur(String.valueOf(ancienTotal));
    h.setNouvelleValeur(String.valueOf(updatedData.getCout()));
    h.setDateModif(now);
    historiqueRepository.save(h);
} else if ("reouverture".equalsIgnoreCase(typeCout)) {
    // mode
    Historique hMode = new Historique();
    hMode.setGrpCout(grp); hMode.setIdTicket(idTicket); hMode.setTypeCout(typeCout);
    hMode.setChampModifie("mode");
    hMode.setAncienneValeur(String.valueOf(filtered.get(0).getMode()));
    hMode.setNouvelleValeur(String.valueOf(updatedData.getMode()));
    hMode.setDateModif(now);
    historiqueRepository.save(hMode);
    // valeur
    Historique hVal = new Historique();
    hVal.setGrpCout(grp); hVal.setIdTicket(idTicket); hVal.setTypeCout(typeCout);
    hVal.setChampModifie("valeur");
    hVal.setAncienneValeur(String.valueOf(filtered.get(0).getValeur()));
    hVal.setNouvelleValeur(String.valueOf(updatedData.getValeur()));
    hVal.setDateModif(now);
    historiqueRepository.save(hVal);
}
```

### `ListModifiable.jsx`

**Ajouter states (après ligne 11) :**
```js
const [histGroup, setHistGroup] = useState(null);
const [histData, setHistData]   = useState([]);

const handleOpenHistorique = async (group) => {
  const data = await getHistoriqueByGrp(group.grp);
  setHistData(data || []);
  setHistGroup(group);
};
```

**Ajouter bouton dans le tableau (après ligne 119) :**
```jsx
<Button variant="outline" size="sm" onClick={() => handleOpenHistorique(group)}>
  Historique
</Button>
```

**Ajouter un second Modal (après la ligne 173) :**
```jsx
<Modal open={!!histGroup} onClose={() => setHistGroup(null)}
  title={`Historique — Ticket #${histGroup?.idTicket}`}>
  <Modal.Body>
    <Table>
      <thead>
        <Tr><Th>Date</Th><Th>Champ</Th><Th>Avant</Th><Th>Après</Th></Tr>
      </thead>
      <tbody>
        {histData.map((h, i) => (
          <Tr key={i}>
            <Td>{new Date(h.dateModif).toLocaleString()}</Td>
            <Td>{h.champModifie}</Td>
            <Td className="text-red-500">{h.ancienneValeur}</Td>
            <Td className="text-green-600">{h.nouvelleValeur}</Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  </Modal.Body>
</Modal>
```

---

# SCÉNARIO C — Dashboard Graphiques d'évolution

## Logique métier
Page avec des graphiques montrant l'évolution mensuelle des Supercouts et Réouvertures, plus un camembert de répartition par catégorie. Utilise le champ `grp` (timestamp) pour grouper par mois.

---

## Fichiers à CRÉER

### `CoutStatsController.java`
**Chemin :** `.../controller/`

```java
@RestController @RequestMapping("/api")
public class CoutStatsController {
    @Autowired CoutRepository coutRepository;

    // GET /api/stats/by-month?type=Supercout
    @GetMapping("/stats/by-month")
    public List<Map<String, Object>> getByMonth(@RequestParam String type) {
        List<Cout> all = coutRepository.findByTypeCout(type);
        Map<String, Double> byMonth = new java.util.TreeMap<>();
        for (Cout c : all) {
            if (c.getGrp() == null) continue;
            java.time.LocalDate d = java.time.Instant.ofEpochMilli(c.getGrp())
                .atZone(java.time.ZoneId.systemDefault()).toLocalDate();
            String key = d.getYear() + "-" + String.format("%02d", d.getMonthValue());
            byMonth.merge(key, c.getCout(), Double::sum);
        }
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        byMonth.forEach((k, v) -> {
            Map<String, Object> row = new java.util.HashMap<>();
            row.put("mois", k);
            row.put("total", Math.round(v * 100) / 100.0);
            result.add(row);
        });
        return result;
    }

    // GET /api/stats/by-category
    @GetMapping("/stats/by-category")
    public List<Map<String, Object>> getByCategory() {
        List<Cout> all = coutRepository.findAll();
        Map<String, Double> byCat = new java.util.TreeMap<>();
        for (Cout c : all) {
            if (c.getCategory() == null) continue;
            byCat.merge(c.getCategory(), c.getCout(), Double::sum);
        }
        List<Map<String, Object>> result = new java.util.ArrayList<>();
        byCat.forEach((k, v) -> {
            Map<String, Object> row = new java.util.HashMap<>();
            row.put("category", k);
            row.put("total", Math.round(v * 100) / 100.0);
            result.add(row);
        });
        return result;
    }
}
```

### `statsService.js`
**Chemin :** `d:\shania\itu\L3\2\glpi\deskflow\src\services\`

```js
const SPRING_API = '/api';

export async function getStatsByMonth(type) {
  const res = await fetch(`${SPRING_API}/stats/by-month?type=${encodeURIComponent(type)}`);
  if (!res.ok) return [];
  return res.json();
}

export async function getStatsByCategory() {
  const res = await fetch(`${SPRING_API}/stats/by-category`);
  if (!res.ok) return [];
  return res.json();
}
```

### `FinancialDashboard.jsx`
**Chemin :** `d:\shania\itu\L3\2\glpi\deskflow\src\pages\frontoffice\`

```jsx
import { useState, useEffect } from 'react';
import { H2, Card, Spinner } from '../../components/templates';
import { getStatsByMonth, getStatsByCategory } from '../../services/statsService';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

const COLORS = ['#6366f1', '#10b981', '#f59e0b'];

export default function FinancialDashboard() {
  const [supercoutData,    setSupercoutData]    = useState([]);
  const [reouvertureData,  setReouvertureData]  = useState([]);
  const [categoryData,     setCategoryData]     = useState([]);
  const [loading,          setLoading]          = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [sc, ro, cat] = await Promise.all([
        getStatsByMonth('Supercout'),
        getStatsByMonth('reouverture'),
        getStatsByCategory()
      ]);
      setSupercoutData(sc);
      setReouvertureData(ro);
      setCategoryData(cat);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <Spinner size="lg" />;

  // Fusionner supercout + réouverture sur le même axe mois
  const allMonths = [...new Set([
    ...supercoutData.map(d => d.mois),
    ...reouvertureData.map(d => d.mois)
  ])].sort();
  const lineData = allMonths.map(mois => ({
    mois,
    supercout:    supercoutData.find(d => d.mois === mois)?.total ?? 0,
    reouverture:  reouvertureData.find(d => d.mois === mois)?.total ?? 0,
  }));

  return (
    <div className="space-y-6">
      <H2>Dashboard Financier</H2>

      <Card>
        <Card.Header><span className="font-semibold">Évolution mensuelle</span></Card.Header>
        <Card.Body>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={lineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis />
              <Tooltip formatter={(v) => `${v} €`} />
              <Legend />
              <Line type="monotone" dataKey="supercout"   stroke="#6366f1" name="Supercout" />
              <Line type="monotone" dataKey="reouverture" stroke="#10b981" name="Réouverture" />
            </LineChart>
          </ResponsiveContainer>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header><span className="font-semibold">Répartition par catégorie</span></Card.Header>
        <Card.Body className="flex justify-center">
          <PieChart width={300} height={250}>
            <Pie data={categoryData} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={100} label>
              {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => `${v} €`} />
          </PieChart>
        </Card.Body>
      </Card>
    </div>
  );
}
```

---

## Fichiers à MODIFIER

### `App.jsx` — ajouter route (après ligne 30)
```jsx
import FinancialDashboard from './pages/frontoffice/FinancialDashboard';
// dans <Routes> :
<Route path="financial-dashboard" element={<FinancialDashboard />} />
```

> **Installer Recharts si absent :**
> ```
> npm install recharts
> ```

---

# SCÉNARIO D — Réouverture Conditionnelle avec Seuil de Rejet

## Logique métier
- Si % réouverture **< seuil_min** → **rejet automatique** (ticket reste clos)
- Si % réouverture **> seuil_alerte** → **confirmation manuelle** obligatoire dans l'interface
- Seuils configurables via une page admin

**Exemple :**
```
seuil_min    = 5%   → open ticket 1, 3% → REJETÉ
seuil_alerte = 80%  → open ticket 2, 90% → demande confirmation
```

---

## Fichiers à CRÉER

### `SeuilConfig.java`
**Chemin :** `.../model/`

```java
@Entity
@Table(name = "seuil_config")
public class SeuilConfig {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String cle;    // "seuil_min" | "seuil_alerte"
    private double valeur;
    // getters / setters
}
```

### `SeuilConfigRepository.java`
```java
@Repository
public interface SeuilConfigRepository extends JpaRepository<SeuilConfig, Long> {
    Optional<SeuilConfig> findByCle(String cle);
}
```

### `SeuilController.java`
```java
@RestController @RequestMapping("/api")
public class SeuilController {
    @Autowired SeuilConfigRepository repo;

    @GetMapping("/seuils")
    public List<SeuilConfig> getAll() { return repo.findAll(); }

    @PostMapping("/seuils")
    public SeuilConfig save(@RequestBody SeuilConfig s) {
        repo.findByCle(s.getCle()).ifPresent(ex -> s.setId(ex.getId()));
        return repo.save(s);
    }

    // GET /api/seuils/check?pct=3.5
    @GetMapping("/seuils/check")
    public Map<String, String> check(@RequestParam double pct) {
        double min    = repo.findByCle("seuil_min").map(SeuilConfig::getValeur).orElse(0.0);
        double alerte = repo.findByCle("seuil_alerte").map(SeuilConfig::getValeur).orElse(100.0);
        Map<String, String> r = new HashMap<>();
        if (pct < min) {
            r.put("statut", "REJET");
            r.put("message", "Pourcentage trop faible (" + pct + "% < min " + min + "%)");
        } else if (pct > alerte) {
            r.put("statut", "ALERTE");
            r.put("message", "Pourcentage élevé (" + pct + "% > alerte " + alerte + "%), confirmation requise");
        } else {
            r.put("statut", "OK");
            r.put("message", "");
        }
        return r;
    }
}
```

### `seuilService.js`
```js
const SPRING_API = '/api';

export async function checkSeuil(pct) {
  const res = await fetch(`${SPRING_API}/seuils/check?pct=${pct}`);
  if (!res.ok) return { statut: 'OK', message: '' };
  return res.json();
}

export async function getAllSeuils() {
  const res = await fetch(`${SPRING_API}/seuils`);
  if (!res.ok) return [];
  return res.json();
}

export async function saveSeuil(cle, valeur) {
  await fetch(`${SPRING_API}/seuils`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cle, valeur })
  });
}
```

---

## Fichiers à MODIFIER

### `importSqlite.js` — dans `processTicketImport` (lignes 105–116)

Ajouter **avant** l'appel à `reopenTicketWithCosts()` :
```js
if (mvt === 'open' || mvt === 'reouverture') {
  const pct = parseFloat(val) || 0;

  // Vérification seuil
  const seuilCheck = await checkSeuil(pct);
  if (seuilCheck.statut === 'REJET') {
    throw new Error(`Réouverture rejetée ticket #${ticketId} : ${seuilCheck.message}`);
  }
  if (seuilCheck.statut === 'ALERTE') {
    console.warn(`[ALERTE] ticket #${ticketId} : ${seuilCheck.message}`);
    // En CSV : on loggue et on continue (pas d'interface pour confirmer)
  }

  // ... suite normale (reopenTicketWithCosts, etc.)
}
```

### `ListModifiable.jsx` — dans `handleSave` (ligne 58)

Ajouter **avant** `updateCoutGroup()` :
```js
const handleSave = async () => {
  if (!editGroup) return;

  // Vérification seuil si réouverture
  if (editGroup.typeCout === 'reouverture') {
    const check = await checkSeuil(editValeur);
    if (check.statut === 'REJET') {
      alert('Réouverture rejetée : ' + check.message);
      return;
    }
    if (check.statut === 'ALERTE') {
      const ok = window.confirm('⚠ ' + check.message + '\n\nConfirmer quand même ?');
      if (!ok) return;
    }
  }

  // Suite normale...
  try {
    await updateCoutGroup(editGroup.grp, { ... });
    // ...
  }
};
```

### `App.jsx` — ajouter route (après ligne 41)
```jsx
import SeuilConfigPage from './pages/backoffice/SeuilConfigPage';
<Route path="backoffice/seuils" element={<SeuilConfigPage />} />
```

---

# Comparaison rapide

| | A — Plafond | B — Historique | C — Graphiques | D — Seuil Rejet |
|---|---|---|---|---|
| Nouveaux modèles Java | 1 | 1 | 0 | 1 |
| Nouveaux controllers Java | 1 | 1 | 1 | 1 |
| Nouveaux services JS | 1 | 1 | 1 | 1 |
| Nouvelles pages React | 1 | 0 | 1 | 1 |
| Fichiers Java modifiés | 1 | 1 | 0 | 0 |
| Fichiers JS/JSX modifiés | 3 | 1 | 1 | 2 |
| Difficulté | ⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Impact visuel | Fort | Moyen | Très fort | Moyen |
