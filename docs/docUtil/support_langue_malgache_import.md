# Guide d'implémentation : Support de la Langue Malgache dans l'Import CSV

Ce guide explique comment adapter l'application (et en particulier le module d'import de données) pour prendre en charge des fichiers CSV contenant des valeurs saisies en **langue malgache (Malagasy)** pour les statuts, types, priorités et équipements.

---

## 1. Compréhension du Problème

Dans le fichier d'importation [importService.js](file:///d:/shania/itu/L3/glpi/deskflow/src/services/importService.js), l'application valide et mappe les valeurs textuelles du CSV en identifiants numériques GLPI à l'aide de dictionnaires de correspondance statiques (`GLPI_STATUS_MAP`, `TICKET_STATUS_MAP`, etc.).

Si un fichier CSV contient des données en malgache (ex: `"Vaovao"` au lieu de `"Nouveau"`), le processus d'import lèvera une erreur de validation lors du **Dry Run** (Phase 2), bloquant ainsi tout l'import.

---

## 2. Table de Traduction Malgache ↔ GLPI

Voici les correspondances standardisées à utiliser pour la traduction :

### Statuts des Tickets (`TICKET_STATUS_MAP`)
| Français | Anglais | Malgache | ID GLPI |
| :--- | :--- | :--- | :--- |
| Nouveau | New | **Vaovao** | 1 |
| En cours (attribué) | In Progress / Processing | **Eo am-panatanterahana** (ou **Andalam-panatanterahana**) | 2 |
| En cours (planifié) | Planned | **Voalahatra** | 3 |
| En attente | Pending | **Miandry** | 4 |
| Résolu | Solved | **Voavaha** | 5 |
| Clos | Closed | **Nakatona** | 6 |

### Types de Tickets (`TICKET_TYPE_MAP`)
| Français | Anglais | Malgache | ID GLPI |
| :--- | :--- | :--- | :--- |
| Incident | Incident | **Tsy fahatomombanana** (ou **Zava-nitranga**) | 1 |
| Demande | Request | **Fangatahana** | 2 |

### Priorités des Tickets (`TICKET_PRIORITY_MAP`)
| Français / Anglais | Malgache | ID GLPI |
| :--- | :--- | :--- |
| Très basse / Very Low | **Tena ambany** | 1 |
| Basse / Low | **Ambany** | 2 |
| Moyenne / Medium | **Antonony** | 3 |
| Haute / High | **Ambony** | 4 |
| Très haute / Very High | **Tena ambony** | 5 |
| Majeure / Major | **Tena lehibe** (ou **Majeure**) | 6 |

### Types d'Équipement (`ITEMTYPE_MAP`)
| Français / Anglais | Malgache | Type GLPI |
| :--- | :--- | :--- |
| Ordinateur / Computer | **Solosaina** | Computer |
| Moniteur / Monitor | **Ekirana** (ou **Mpanara-maso**) | Monitor |
| Téléphone / Phone | **Telefaonina** | Phone |

### États des Équipements (`GLPI_STATUS_MAP`)
| Français / Anglais | Malgache | ID GLPI (ou nom d'état) |
| :--- | :--- | :--- |
| En production | **Miasa** (ou **Am-piasana**) | 1 |
| En panne | **Simba** | 4 |
| En stock | **Ao amin'ny tahiry** | 3 |
| Maintenance | **Eo am-pikarakarana** | 5 |

---

## 3. Modifications à apporter dans le code

Pour supporter ces valeurs lors de l'importation, modifiez les constantes au début du fichier [importService.js](file:///d:/shania/itu/L3/glpi/deskflow/src/services/importService.js) :

### Étape 1 : Mettre à jour `GLPI_STATUS_MAP` (Lignes 5-10)
```javascript
const GLPI_STATUS_MAP = {
  'En production': 1,
  'En panne':      4,
  'En stock':      3,
  'Maintenance':   5,
  // Support Malgache
  'Miasa':         1,
  'Am-piasana':    1,
  'Simba':         4,
  'Ao amin\'ny tahiry': 3,
  'Tahiry':        3,
  'Eo am-pikarakarana': 5,
};
```

### Étape 2 : Mettre à jour `TICKET_STATUS_MAP` (Lignes 12-24)
```javascript
const TICKET_STATUS_MAP = {
  'New':         1,
  'Nouveau':     1,
  'In Progress': 2,
  'Processing':  2,
  'En cours':    2,
  'Assigned':    2,
  'Assigné':     2,
  'Closed':      6,
  'Clos':        6,
  // Support Malgache
  'Vaovao':                 1,
  'Eo am-panatanterahana':  2,
  'Andalam-panatanterahana':2,
  'Voalahatra':             3,
  'Miandry':                4,
  'Voavaha':                5,
  'Nakatona':               6,
};
```

### Étape 3 : Mettre à jour `TICKET_PRIORITY_MAP` (Lignes 26-43)
```javascript
const TICKET_PRIORITY_MAP = {
  'Very Low':  1,
  'Très basse': 1,
  'Low':       2,
  'Basse':     2,
  'Medium':    3,
  'Moyenne':   3,
  'High':      4,
  'Haute':     4,
  'Very High': 5,
  'Très haute': 5,
  'Critical':  5,
  'Major':     6,
  'Majeure':   6,
  // Support Malgache
  'Tena ambany': 1,
  'Ambany':      2,
  'Antonony':    3,
  'Ambony':      4,
  'Tena ambony': 5,
  'Tena lehibe': 6,
};
```

### Étape 4 : Mettre à jour `TICKET_TYPE_MAP` (Lignes 45-49)
```javascript
const TICKET_TYPE_MAP = {
  'Incident': 1,
  'Request':  2,
  'Demande':  2,
  // Support Malgache
  'Tsy fahatomombanana': 1,
  'Zava-nitranga':       1,
  'Fangatahana':         2,
};
```

### Étape 5 : Mettre à jour `ITEMTYPE_MAP` (Lignes 51-60)
```javascript
const ITEMTYPE_MAP = {
  'Computer':   'Computer',
  'Monitor':    'Monitor',
  'Phone':      'Phone',
  'Ordinateur': 'Computer',
  'Moniteur':   'Monitor',
  'Téléphone':  'Phone',
  // Support Malgache
  'Solosaina':    'Computer',
  'Ekirana':      'Monitor',
  'Mpanara-maso': 'Monitor',
  'Telefaonina':  'Phone',
};
```

---

## 4. Impact sur la Base SQLite Locale (Backend)

Dans notre projet actuel, les traductions par défaut en malgache sont **déjà incluses et initialisées automatiquement** dans la base SQLite locale via le point d'entrée du backend [SqliteApplication.java](file:///d:/shania/itu/L3/glpi/sqlite/src/main/java/com/eval/sqlite/SqliteApplication.java) (lignes 42 à 51).

Voici un aperçu de ce qui est déjà configuré et injecté au démarrage de l'application :

```java
// Malagasy translations déjà présentes dans SqliteApplication.java
new Translation("mg", "nouveau", "Vaovao"),
new Translation("mg", "nouveaux", "Vaovao"),
new Translation("mg", "in_progress", "An-dalana"),
new Translation("mg", "termine", "Vita"),
new Translation("mg", "en_attente", "Miandry"),
new Translation("mg", "assignes", "Nomeny"),
new Translation("mg", "planifies", "Natao plan"),
new Translation("mg", "resolus", "Vita"),
new Translation("mg", "fermes", "Mihidy")
```

> [!NOTE]
> Aucune action supplémentaire n'est requise sur la base SQLite pour le seeding initial, car l'application s'occupe de tout au démarrage. Si vous devez ajouter de nouvelles traductions personnalisées en malgache, vous pouvez le faire via l'écran du Backoffice ou en modifiant cette liste dans `SqliteApplication.java`.


---

## 5. Exemple de Fichier CSV de Test (Malgache)

Pour valider l'implémentation de l'importation, créez un fichier de test contenant les lignes suivantes :

### `equipements_mg.csv`
```csv
Name;Status;Location;Manufacturer;Item_Type;Model;Inventory_Number;User
PC-ADM-MG01;Miasa;Bureau Central;HP;Solosaina;ProBook 450;INV-9991;Randria
MN-ADM-MG01;Ao amin'ny tahiry;Stock Principal;Dell;Ekirana;UltraSharp;INV-9992;Rakoto
```

### `tickets_mg.csv`
```csv
Ref_Ticket;Date;Heure;Type;Titre;Description;Status;Priority;Items
201;12/06/2026;10:15;Tsy fahatomombanana;Ecran noir;L'ecran ne s'allume pas;Vaovao;Antonony;PC-ADM-MG01
202;12/06/2026;11:00;Fangatahana;Demande souris;Besoin d'une souris sans fil;Nakatona;Ambany;MN-ADM-MG01
```
