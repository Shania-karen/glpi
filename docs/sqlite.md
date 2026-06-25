# Scénarios SQLite — Logique Métier Avancée

---

# SCÉNARIO E — Amortissement des Coûts dans le Temps

## Logique métier
Chaque catégorie a un **taux d'amortissement annuel** (ex: Computer = 20%/an).
Quand on affiche les coûts dans `ListCosts`, le montant affiché est le coût **amorti** selon l'âge du ticket (date du `grp`).

```
Supercout Computer = 1000 €, il y a 18 mois, taux = 20%/an
Valeur amortie = 1000 × (1 - 0.20 × 1.5) = 700 €
```

## Nouvelle table SQLite à créer

### `TauxAmortissement.java` — `.../model/`
```java
@Entity
@Table(name = "taux_amortissement")
public class TauxAmortissement {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String category;   // "Computer" | "Monitor" | "Phone"
    private double tauxAnnuel; // ex: 0.20 pour 20%
    // getters / setters
}
```

### `TauxAmortissementRepository.java` — `.../repository/`
```java
Optional<TauxAmortissement> findByCategory(String category);
```

### `TauxAmortissementController.java` — `.../controller/`
```
GET  /api/amortissement                → liste tous les taux
POST /api/amortissement                → créer/mettre à jour
GET  /api/amortissement/calcul/{grp}   → valeur amortie d'un groupe
```

**Méthode calcul :**
```java
@GetMapping("/amortissement/calcul/{grp}")
public Map<String, Object> calculerAmorti(@PathVariable Long grp) {
    List<Cout> rows = coutRepo.findAll().stream()
        .filter(c -> grp.equals(c.getGrp())).toList();
    if (rows.isEmpty()) return Map.of("valeurAmortie", 0.0);

    double total = rows.stream().mapToDouble(Cout::getCout).sum();
    String cat   = rows.get(0).getCategory();

    double taux = tauxRepo.findByCategory(cat)
        .map(TauxAmortissement::getTauxAnnuel).orElse(0.0);

    // âge en années depuis le grp (timestamp)
    double ageAns = (System.currentTimeMillis() - grp) / (1000.0 * 60 * 60 * 24 * 365);
    double valeurAmortie = Math.max(0, total * (1 - taux * ageAns));
    valeurAmortie = Math.round(valeurAmortie * 100) / 100.0;

    return Map.of("total", total, "ageAns", ageAns, "valeurAmortie", valeurAmortie);
}
```

### `amortissementService.js` — `.../services/`
```js
const API = '/api';
export async function getAllTaux() {
    const res = await fetch(`${API}/amortissement`);
    return res.ok ? res.json() : [];
}
export async function saveTaux(category, tauxAnnuel) {
    await fetch(`${API}/amortissement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, tauxAnnuel })
    });
}
export async function calculerAmorti(grp) {
    const res = await fetch(`${API}/amortissement/calcul/${grp}`);
    return res.ok ? res.json() : null;
}
```

## Fichiers à modifier

### `ListCosts.jsx` — dans le `useMemo aggregated`
Après le calcul du total par catégorie, ajouter la valeur amortie :
```js
// Pour chaque groupe Supercout, appeler calculerAmorti(grp)
// Stocker dans summary[normCat].amorti += valeurAmortie
```

Ajouter colonne dans le tableau :
```jsx
<Th>Valeur Amortie</Th>
<Td>{data.amorti?.toFixed(2)} €</Td>
```

---

# SCÉNARIO F — Clôture Périodique (Gel des Coûts par Mois)

## Logique métier
À la fin de chaque mois, on **gèle** tous les coûts du mois : plus aucune modification possible sur les entrées de cette période. On génère un enregistrement de **synthèse mensuelle** dans une table dédiée.

```
Période 2026-05 → gelée → toute tentative de modifier une entrée de mai → ERREUR
```

## Nouvelle table SQLite

### `PeriodeSynthese.java` — `.../model/`
```java
@Entity
@Table(name = "periode_synthese")
public class PeriodeSynthese {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String periode;       // "2026-05"
    private boolean gelee;        // true = plus de modifications
    private double totalSupercout;
    private double totalReouverture;
    private double totalAnnulation;
    private Long   dateGel;       // timestamp du gel
    // getters / setters
}
```

### `PeriodeSyntheseRepository.java`
```java
Optional<PeriodeSynthese> findByPeriode(String periode);
List<PeriodeSynthese> findByGeleeTrue();
```

### `PeriodeSyntheseController.java`
```
GET  /api/periodes                  → toutes les périodes
POST /api/periodes/geler/{periode}  → geler une période (ex: "2026-05")
GET  /api/periodes/check/{grp}      → { gelee: true/false } pour un timestamp donné
```

**Méthode `geler` :**
```java
@PostMapping("/periodes/geler/{periode}")
public ResponseEntity<?> geler(@PathVariable String periode) {
    // Calculer les totaux pour la période
    List<Cout> all = coutRepo.findAll();
    double sc = 0, ro = 0, an = 0;
    for (Cout c : all) {
        if (c.getGrp() == null) continue;
        java.time.LocalDate d = java.time.Instant.ofEpochMilli(c.getGrp())
            .atZone(java.time.ZoneId.systemDefault()).toLocalDate();
        String mois = d.getYear() + "-" + String.format("%02d", d.getMonthValue());
        if (!mois.equals(periode)) continue;
        if ("Supercout".equalsIgnoreCase(c.getTypeCout()))    sc += c.getCout();
        if ("reouverture".equalsIgnoreCase(c.getTypeCout()))  ro += c.getCout();
        if ("annulation".equalsIgnoreCase(c.getTypeCout()))   an += c.getCout();
    }
    PeriodeSynthese p = periodeRepo.findByPeriode(periode).orElse(new PeriodeSynthese());
    p.setPeriode(periode);
    p.setGelee(true);
    p.setTotalSupercout(Math.round(sc * 100) / 100.0);
    p.setTotalReouverture(Math.round(ro * 100) / 100.0);
    p.setTotalAnnulation(Math.round(an * 100) / 100.0);
    p.setDateGel(System.currentTimeMillis());
    periodeRepo.save(p);
    return ResponseEntity.ok().build();
}
```

**Dans `updateGroup()` de `CoutController.java`, bloquer si période gelée :**
```java
// Vérifier si le grp appartient à une période gelée
java.time.LocalDate d = java.time.Instant.ofEpochMilli(grp)
    .atZone(java.time.ZoneId.systemDefault()).toLocalDate();
String mois = d.getYear() + "-" + String.format("%02d", d.getMonthValue());
Optional<PeriodeSynthese> periode = periodeRepo.findByPeriode(mois);
if (periode.isPresent() && periode.get().isGelee()) {
    return ResponseEntity.status(423).body("Période " + mois + " gelée, modification impossible.");
}
```

### `periodeService.js` — `.../services/`
```js
const API = '/api';
export async function getAllPeriodes() {
    const res = await fetch(`${API}/periodes`);
    return res.ok ? res.json() : [];
}
export async function gelerPeriode(periode) {
    const res = await fetch(`${API}/periodes/geler/${periode}`, { method: 'POST' });
    if (!res.ok) throw new Error(await res.text());
}
```

## Fichiers à modifier

### `ListModifiable.jsx` — dans `handleSave`
```js
// Avant updateCoutGroup(), vérifier si période gelée
// L'API renvoie 423 si gelée → afficher message d'erreur
try {
    await updateCoutGroup(...);
} catch (err) {
    if (err.message.includes('gelée')) {
        alert('Cette période est gelée. Modification impossible.');
        return;
    }
    throw err;
}
```

---

# SCÉNARIO G — Coût Prévisionnel vs Coût Réel

## Logique métier
Quand un ticket est **ouvert** (dans GLPI), on enregistre un **coût prévisionnel** estimé. Quand il est **clôturé** (close), on enregistre le coût réel. On peut ensuite comparer l'écart prévisionnel/réel pour chaque ticket.

**Nouvelle colonne CSV :**
```
ticket,mvt,valeur,mode
1,prevision,500,       ← coût estimé à l'ouverture
1,close,450,           ← coût réel à la clôture
2,prevision,200,
2,close,310,           ← dépassement de 110 €
```

## Changements SQLite

### Dans `Cout.java` — ajouter un champ (à la fin, avant la dernière `}`)
```java
private String sousType;  // null | "prevision" | "reel"
// getter + setter
```

> Cela étend la table existante avec une nouvelle colonne. SQLite créera la colonne automatiquement au démarrage si `spring.jpa.hibernate.ddl-auto=update`.

### Nouvelle requête dans `CoutRepository.java`
```java
// Tous les coûts prévisionnels d'un ticket
List<Cout> findByIdTicketAndSousType(Long idTicket, String sousType);

// Somme des prévisionnels vs réels par catégorie
@Query("SELECT c.category, c.sousType, SUM(c.cout) FROM Cout c WHERE c.sousType IN ('prevision','reel') GROUP BY c.category, c.sousType")
List<Object[]> findComparaisonPrevisionnelReel();
```

### `CoutController.java` — nouveau endpoint (ajouter après ligne 106)
```java
// GET /api/couts/comparaison
@GetMapping("/couts/comparaison")
public List<Map<String, Object>> getComparaison() {
    List<Object[]> raw = coutRepository.findComparaisonPrevisionnelReel();
    List<Map<String, Object>> result = new java.util.ArrayList<>();
    for (Object[] row : raw) {
        Map<String, Object> m = new java.util.HashMap<>();
        m.put("category", row[0]);
        m.put("sousType", row[1]);
        m.put("total",    Math.round(((Double) row[2]) * 100) / 100.0);
        result.add(m);
    }
    return result;
}
```

## Fichiers JS à modifier

### `importSqlite.js` — dans `processTicketImport` (lignes 86–127)
Ajouter le cas `prevision` :
```js
} else if (mvt === 'prevision') {
    const totalCout = parseFloat(val) || 0;
    const grp = Date.now();
    const res = await createCout({
        idTicket: ticketId,
        typeCout: 'Supercout',
        cout: totalCout,
        grp,
        // on passe sousType via un champ supplémentaire
        sousType: 'prevision'
    });
    ids = res?.idAuto ? [res.idAuto] : [];
```

### `coutService.js` — dans `createCout` (ligne 8)
Ajouter `sousType` au payload :
```js
export async function createCout({ idTicket, typeCout, cout, idItem = null,
    category = null, grp = null, mode = null, valeur = null, sousType = null }) {
  const payload = {
    // ... champs existants ...
    sousType: sousType || null,   // ← ajouter cette ligne
  };
```

### Nouvelle page `ComparaisonCouts.jsx` — `.../pages/frontoffice/`
```jsx
import { useState, useEffect } from 'react';
import { H2, Table, Tr, Th, Td, Badge, Spinner } from '../../components/templates';

export default function ComparaisonCouts() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/couts/comparaison');
      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    load();
  }, []);

  // Regrouper par category
  const cats = ['Computer', 'Monitor', 'Phone'];

  if (loading) return <Spinner size="lg" />;

  return (
    <div className="space-y-6">
      <H2>Prévisionnel vs Réel</H2>
      <Table>
        <thead>
          <Tr><Th>Catégorie</Th><Th>Prévisionnel</Th><Th>Réel</Th><Th>Écart</Th></Tr>
        </thead>
        <tbody>
          {cats.map(cat => {
            const prev = data.find(d => d.category === cat && d.sousType === 'prevision')?.total ?? 0;
            const reel = data.find(d => d.category === cat && d.sousType === 'reel')?.total ?? 0;
            const ecart = reel - prev;
            return (
              <Tr key={cat}>
                <Td className="font-semibold">{cat}</Td>
                <Td>{prev.toFixed(2)} €</Td>
                <Td>{reel.toFixed(2)} €</Td>
                <Td>
                  <Badge variant={ecart > 0 ? 'danger' : 'success'}>
                    {ecart > 0 ? '+' : ''}{ecart.toFixed(2)} €
                  </Badge>
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </div>
  );
}
```

### `App.jsx` — ajouter route
```jsx
import ComparaisonCouts from './pages/frontoffice/ComparaisonCouts';
<Route path="comparaison-couts" element={<ComparaisonCouts />} />
```

---

# Résumé des 3 nouveaux scénarios

| | E — Amortissement | F — Clôture Périodique | G — Prévisionnel vs Réel |
|---|---|---|---|
| Nouvelles tables SQLite | 1 (`taux_amortissement`) | 1 (`periode_synthese`) | 0 (colonne ajoutée) |
| Nouveaux models Java | 1 | 1 | modif `Cout.java` |
| Nouveaux controllers Java | 1 | 1 | 1 endpoint dans `CoutController` |
| Nouveaux services JS | 1 | 1 | modif `coutService.js` |
| Nouvelles pages React | 1 (config taux) | 1 (liste périodes) | 1 (`ComparaisonCouts`) |
| Fichiers existants modifiés | `ListCosts.jsx` | `CoutController.java`, `ListModifiable.jsx` | `importSqlite.js`, `coutService.js` |
| Difficulté | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| Concept clé SQLite | Calcul sur timestamp grp | Gel par période | Nouveau champ sousType |
