# Architecture Optimisée : L'Événement Unique (One Row per Event)

Ce document présente une solution alternative et **nettement plus optimale** pour gérer les coûts de réouverture financière. Elle résout la complexité de l'approche précédente en modifiant la façon dont les clôtures de tickets sont enregistrées en base de données.

---

## 1. Le Problème de l'Approche Actuelle

Dans l'approche actuelle, lors d'une clôture (Supercout), si un ticket est lié à 3 équipements, on insère **3 lignes distinctes** en base (ex: 100€ + 100€ + 100€ pour une clôture de 300€).

### Inconvénients :
1. **Inflation de la base de données** : $N$ lignes créées pour chaque clôture (où $N$ est le nombre d'équipements).
2. **Complexité des requêtes SQL** : Obligation d'utiliser des formules complexes comme `SUM(cout) / COUNT(DISTINCT grp)` pour obtenir la moyenne réelle d'une clôture.
3. **Risque d'incohérence** : Si une seule ligne du groupe est accidentellement supprimée ou modifiée, tout l'historique de la clôture est faussé.

---

## 2. La Solution Optimisée : La Clôture Unique

Au lieu de diviser le coût au moment de l'écriture (insertion), on stocke **une seule et unique ligne par clôture** dans la table `couts`, représentant la transaction globale. 

Pour savoir quels équipements étaient concernés, on stocke la liste de leurs identifiants sous forme textuelle (ex: `"12,15"` ou au format JSON) et le nombre d'équipements associés.

### Nouvelle Structure de la Table `couts` :

| Champ | Type | Description | Exemple |
| :--- | :--- | :--- | :--- |
| `id_auto` | Long (PK) | Identifiant unique | `42` |
| `id_ticket` | Long | ID du ticket GLPI | `5` |
| `type_cout` | String | `"Supercout"` ou `"reouverture"` | `"Supercout"` |
| `cout` | Double | Coût global brut de l'événement | **`300.0`** |
| `items_ids` | String | Liste des IDs d'équipements concernés | `"12,15"` |
| `nb_items` | Integer | Nombre d'équipements | `2` |

---

## 3. Simplification Radicale des Requêtes SQL (Spring Boot)

Grâce à cette structure à ligne unique, les calculs de moyenne et de somme deviennent des agrégations SQL standard, **très performantes et indexables** :

```java
@Repository
public interface CoutRepository extends JpaRepository<Cout, Long> {

    // Mode 1 : Prendre le tout dernier Supercout
    // O(1) : Pas de sous-requête MAX(), tri simple par clé primaire décroissante
    @Query("SELECT c FROM Cout c WHERE c.idTicket = :idTicket AND c.typeCout = 'Supercout' " +
           "ORDER BY c.idAuto DESC LIMIT 1")
    Optional<Cout> findLatestSupercout(@Param("idTicket") Long idTicket);

    // Mode 2 : Prendre le tout premier Supercout
    // O(1) : Tri simple par clé primaire croissante
    @Query("SELECT c FROM Cout c WHERE c.idTicket = :idTicket AND c.typeCout = 'Supercout' " +
           "ORDER BY c.idAuto ASC LIMIT 1")
    Optional<Cout> findFirstSupercout(@Param("idTicket") Long idTicket);

    // Mode 3 : La Moyenne
    // Plus besoin de COUNT(DISTINCT grp) ! AVG() standard fonctionne directement.
    @Query("SELECT AVG(c.cout) FROM Cout c WHERE c.idTicket = :idTicket AND c.typeCout = 'Supercout'")
    Double findAverageSupercout(@Param("idTicket") Long idTicket);

    // Mode 4 : La Somme
    @Query("SELECT SUM(c.cout) FROM Cout c WHERE c.idTicket = :idTicket AND c.typeCout = 'Supercout'")
    Double findSumSupercout(@Param("idTicket") Long idTicket);
}
```

---

## 4. Comment se fait la répartition (Proration) ?

Puisque la base de données ne stocke qu'une ligne globale, la répartition par équipement se fait **à la volée à la lecture** (lors de l'affichage sur le tableau de bord ou l'export de rapports) :

$$\text{Coût par équipement} = \frac{\text{cout}}{\text{nb\_items}}$$

### Exemple de requête de répartition pour les rapports :
```sql
SELECT id_ticket, (cout / nb_items) AS cout_proratise, items_ids 
FROM couts 
WHERE type_cout = 'Supercout';
```

---

## 5. Comparatif des deux architectures

| Critère | Approche Actuelle (Proratisation à l'écriture) | Approche Optimisée (Événement Unique) |
| :--- | :--- | :--- |
| **Nombre de lignes en base** | Élevé ($N$ lignes par clôture) | **Faible (1 ligne par clôture)** |
| **Complexité de la requête Moyenne** | Complexe (`SUM` / `COUNT DISTINCT`) | **Triviale (`AVG(cout)`)** |
| **Requête Dernier / Premier** | Sous-requête SQL lente (`MAX(grp)`) | **Tri rapide (`ORDER BY idAuto LIMIT 1`)** |
| **Robustesse des données** | Risque de désynchronisation des groupes | **Intégrité absolue (l'événement est atomique)** |
| **Flexibilité** | Figée au moment de la clôture | **Modifiable si les équipements liés changent** |
