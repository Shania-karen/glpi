# Guide Complet : Conception Robuste & Évolutive sous SQLite / Spring Boot (Spécial Examen)

Pour un examen, avoir une conception robuste signifie que **si le sujet change ou ajoute une règle métier, vous devez pouvoir l'implémenter en moins de 15 minutes** sans tout casser. 

Voici les deux approches fondamentales à maîtriser.

---

## Approche 1 : L'extensibilité par Données (La table générique / polymorphe)

C'est ce que nous avons fait pour la table `couts`. Au lieu de créer une table par type de coût (`Supercout`, `ouvertureCost`, etc.), nous avons conçu une unique table **générique** :

### Schéma de la table unifiée :
*   `idAuto` (Clé primaire autogénérée)
*   `idTicket` (ID unique du ticket GLPI)
*   `status` (Nom ou ID du statut du ticket au moment du coût, ex: `'Terminé'`)
*   `idItem` / `category` (Représente les **éléments** matériels concernés, ex: ID `5` + `'Computer'`)
*   `coutGlpi` (Double : le coût provenant de l'API GLPI à cet instant)
*   `typeCout` (String : le type d'opération, ex: `'Supercout'`, `'reouverture'`, `'annulation'`, `'extra'`)
*   `cout` (Double : le montant spécifique calculé côté SQLite)
*   `grp` (Long : timestamp/groupe pour lier les lignes insérées simultanément)

### Pourquoi c'est robuste ?
1. **Zéro dépendance de calcul** : En stockant directement le `status` et le `coutGlpi` au moment de la transaction dans la ligne SQLite, vous n'avez plus besoin de recalculer les jointures complexes en combinant des appels API lents à l'affichage.
2. **Historisation naturelle** : Toutes les transactions s'empilent. Si vous devez faire une somme brute ou nette, une requête SQL simple ou une réduction (`SUM()`) sur la colonne `cout` suffit.
3. **Proratisation figée** : Les données liées aux **éléments** matériels (`idItem`, `category`) et les coûts GLPI (`coutGlpi`) sont figés lors de l'insertion. Même si le ticket change plus tard dans GLPI, l'historique financier de la base SQLite reste exact.

---

## Approche 2 : Créer une Nouvelle Table / Entité en 10 minutes

Si le sujet vous impose de créer une toute nouvelle table (par exemple une table `historique_statuts` ou `configurations`), suivez cette structure standardisée rapide à implémenter.

### Étape 1 : Le Modèle JPA (Java Entity)
Créez la classe dans `model/`. Utilisez des types objets (ex: `Long` au lieu de `long`) pour autoriser les valeurs `null`.

```java
package com.eval.sqlite.model;

import jakarta.persistence.*;

@Entity
@Table(name = "configurations") // Nom de la table en base
public class Configuration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idAuto;

    @Column(name = "cle", nullable = false)
    private String cle;

    @Column(name = "valeur")
    private String valeur;

    @Column(name = "grp")
    private Long grp; // Toujours utile pour grouper/ordonner

    // Constructeurs
    public Configuration() {}

    public Configuration(String cle, String valeur, Long grp) {
        this.cle = cle;
        this.valeur = valeur;
        this.grp = grp;
    }

    // Getters & Setters
    public Long getIdAuto() { return idAuto; }
    public void setIdAuto(Long idAuto) { this.idAuto = idAuto; }
    public String getCle() { return cle; }
    public void setCle(String cle) { this.cle = cle; }
    public String getValeur() { return valeur; }
    public void setValeur(String valeur) { this.valeur = valeur; }
    public Long getGrp() { return grp; }
    public void setGrp(Long grp) { this.grp = grp; }
}
```

### Étape 2 : Le Repository
Créez l'interface dans `repository/`. Elle hérite de `JpaRepository` pour avoir toutes les opérations CRUD gratuites (save, findAll, deleteById, etc.).

```java
package com.eval.sqlite.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.eval.sqlite.model.Configuration;
import java.util.List;

@Repository
public interface ConfigurationRepository extends JpaRepository<Configuration, Long> {
    // Requête personnalisée automatique générée par Spring Data JPA
    List<Configuration> findByCle(String cle);
}
```

### Étape 3 : Le REST Controller
Créez la classe dans `controller/`. Elle expose les endpoints HTTP pour le frontend React.

```java
package com.eval.sqlite.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.eval.sqlite.model.Configuration;
import com.eval.sqlite.repository.ConfigurationRepository;
import java.util.List;

@RestController
@RequestMapping("/api/configurations") // Route de base
@CrossOrigin(origins = "*") // Évite les soucis de CORS en local
public class ConfigurationController {

    @Autowired
    private ConfigurationRepository repository;

    @GetMapping
    public List<Configuration> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public Configuration create(@RequestBody Configuration config) {
        if (config.getGrp() == null) {
            config.setGrp(System.currentTimeMillis());
        }
        return repository.save(config);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        repository.deleteById(id);
    }
}
```

### Étape 4 : Le Service React (Frontend)
Créez un fichier JavaScript dans `src/services/configService.js` pour appeler ces endpoints :

```javascript
const API_URL = '/api/configurations';

export async function getAllConfigs() {
  const res = await fetch(API_URL);
  return res.ok ? res.json() : [];
}

export async function createConfig(cle, valeur) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cle, valeur, grp: Date.now() })
  });
  return res.json();
}

export async function deleteConfig(idAuto) {
  await fetch(`${API_URL}/${idAuto}`, { method: 'DELETE' });
}
```

---

## 💡 Règles d'Or pour Réussir la Conception à l'Examen

1. **Pas de clés étrangères strictes en base** : Ne mettez pas de `@ManyToOne` ou de `@JoinColumn` liés aux entités GLPI. Pourquoi ? Parce que GLPI est sur MySQL et vos coûts sont sur SQLite (deux bases différentes !). Utilisez de simples clés logiques (`Long idTicket` ou `String category`) sous forme de colonnes ordinaires.
2. **Utilisez toujours un champ `grp` ou `timestamp`** : Cela vous sauvera pour toutes les fonctionnalités d'annulation ou de récupération du "dernier état" (`MAX(grp)`).
3. **Persistez les données calculées directement en base** : Comme la catégorie ou le nom de l'équipement. Cela vous évite de devoir faire des jointures complexes ou des appels API imbriqués lents au moment de l'affichage.
