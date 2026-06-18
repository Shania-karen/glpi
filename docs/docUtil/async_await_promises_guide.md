# Guide Pratique : Synchrone, Promesses, et Async/Await en JavaScript

Ce guide explique de manière détaillée les concepts de programmation synchrone et asynchrone en JavaScript/TypeScript, avec des exemples concrets pour chaque approche.

---

## 1. Programmation Synchrone (Sync)
La programmation synchrone est le comportement par défaut de JavaScript. Le code est exécuté ligne par ligne, dans l'ordre où il apparaît. Chaque ligne doit attendre que la précédente ait terminé son exécution pour commencer.

### Caractéristiques
- **Bloquant** : Si une instruction prend du temps (par exemple, un calcul lourd ou une boucle géante), toute l'application est "gelée" (bloquée).
- **Prévisible** : L'ordre d'exécution est strictement séquentiel.

### Exemple précis : Lecture séquentielle et calcul lourd
```javascript
// Exemple de fonction synchrone de calcul
function calculLourd(iterations) {
    console.log("Début du calcul...");
    let result = 0;
    for (let i = 0; i < iterations; i++) {
        result += Math.sqrt(i);
    }
    console.log("Fin du calcul.");
    return result;
}

console.log("Étape 1 : Démarrage du script");
const score = calculLourd(50000000); // Bloque l'exécution ici pendant 1 à 2 secondes
console.log(`Étape 2 : Résultat du calcul = ${score}`);
console.log("Étape 3 : Fin du script");
```

**Sortie console attendue :**
```text
Étape 1 : Démarrage du script
Début du calcul...
Fin du calcul.
Étape 2 : Résultat du calcul = 235702260
Étape 3 : Fin du script
```
*Ici, l'étape 3 ne pourra jamais commencer tant que la boucle dans `calculLourd` n'est pas complètement terminée.*

---

## 2. Les Promesses (Promises)
Une **Promesse** (Promise) représente une valeur qui peut être disponible maintenant, dans le futur, ou jamais. C'est l'un des premiers mécanismes de JavaScript pour gérer le code asynchrone sans tomber dans le "Callback Hell" (l'enfer des fonctions de rappel imbriquées).

Une Promesse a 3 états possibles :
1. **Pending** (En cours) : L'action asynchrone n'a pas encore terminé.
2. **Fulfilled** (Résolue) : L'action a réussi, et la promesse renvoie une valeur (gérée par `.then()`).
3. **Rejected** (Rejetée) : L'action a échoué, et la promesse renvoie une erreur (gérée par `.catch()`).

### Exemple précis : Simulation d'un appel réseau (Fetch) avec une Promesse
```javascript
// Fonction qui retourne une Promesse pour simuler le chargement d'un utilisateur
function obtenirUtilisateur(id) {
    return new Promise((resolve, reject) => {
        console.log(`Recherche de l'utilisateur ${id} en cours...`);
        
        // Simulation d'un délai réseau de 2 secondes
        setTimeout(() => {
            const utilisateursDb = {
                1: { name: "Shania", role: "Développeuse" },
                2: { name: "Karen", role: "Administratrice" }
            };
            
            const utilisateur = utilisateursDb[id];
            
            if (utilisateur) {
                resolve(utilisateur); // La promesse est résolue avec succès
            } else {
                reject(new Error(`Utilisateur avec l'ID ${id} non trouvé.`)); // Échec
            }
        }, 2000);
    });
}

// Utilisation de la Promesse avec .then(), .catch() et .finally()
console.log("Début de la requête...");

obtenirUtilisateur(1)
    .then((user) => {
        console.log("Utilisateur trouvé avec succès :", user);
        return user.name; // On peut retourner une valeur pour le prochain .then()
    })
    .then((nom) => {
        console.log(`Le nom récupéré est : ${nom}`);
    })
    .catch((erreur) => {
        console.error("Erreur lors de la récupération :", erreur.message);
    })
    .finally(() => {
        console.log("Opération terminée (réussite ou échec).");
    });

console.log("Cette ligne s'exécute IMMÉDIATEMENT sans attendre les 2 secondes !");
```

**Sortie console attendue :**
```text
Début de la requête...
Recherche de l'utilisateur 1 en cours...
Cette ligne s'exécute IMMÉDIATEMENT sans attendre les 2 secondes !
[ ... 2 secondes s'écoulent ... ]
Utilisateur trouvé avec succès : { name: 'Shania', role: 'Développeuse' }
Le nom récupéré est : Shania
Opération terminée (réussite ou échec).
```

---

## 3. Async / Await
Introduit en ES2017, `async` et `await` sont du sucre syntaxique construit par-dessus les Promesses. Ils permettent d'écrire du code asynchrone qui ressemble et se lit comme du code synchrone.

- **`async`** : Placé devant la déclaration d'une fonction, il indique que la fonction retournera toujours une Promesse (même si on retourne une valeur simple, elle sera encapsulée dans une Promesse).
- **`await`** : Placé uniquement à l'intérieur d'une fonction déclarée `async`, il met en pause l'exécution de la fonction jusqu'à ce que la Promesse soit résolue ou rejetée.

### Exemple précis : Récupération de données avec gestion des erreurs
Reprenons la fonction `obtenirUtilisateur(id)` de l'exemple précédent :

```javascript
// Fonction asynchrone principale
async function afficherInfosUtilisateur(id) {
    try {
        console.log("Lancement du traitement...");
        
        // Le mot-clé await attend que la promesse soit résolue.
        // L'exécution de cette fonction est "suspendue" ici, sans bloquer le reste de l'application.
        const user = await obtenirUtilisateur(id); 
        
        console.log(`Utilisateur récupéré : ${user.name} (${user.role})`);
    } catch (erreur) {
        // Les erreurs de la promesse rejetée sont capturées ici
        console.error("Une erreur est survenue :", erreur.message);
    } finally {
        console.log("Nettoyage des connexions terminé.");
    }
}

// Appel de la fonction asynchrone
console.log("Avant l'appel async");
afficherInfosUtilisateur(1);
console.log("Après l'appel async (exécuté instantanément)");
```

**Sortie console attendue :**
```text
Avant l'appel async
Lancement du traitement...
Recherche de l'utilisateur 1 en cours...
Après l'appel async (exécuté instantanément)
[ ... 2 secondes s'écoulent ... ]
Utilisateur récupéré : Shania (Développeuse)
Nettoyage des connexions terminé.
```

---

## 4. Comparaison : Callback vs Promise vs Async/Await
Imaginons un scénario réel : nous devons lire un fichier de configuration, puis charger les données de la base de données associées, puis générer un rapport.

| Approche | Lisibilité | Gestion des erreurs | Clarté du flux |
| :--- | :--- | :--- | :--- |
| **Callbacks** | Mauvaise (Callback Hell, décalage vers la droite) | Difficile (chaque callback doit gérer son erreur `(err, data) => {}`) | Très confuse |
| **Promises (`.then`)** | Moyenne (mieux, mais les chaînes peuvent devenir longues) | Centralisée avec `.catch()` | Linéaire mais verbeuse |
| **Async / Await** | Excellente (ressemble à du synchrone standard) | Centralisée et naturelle avec `try...catch` | Très propre et intuitive |

### Exemple comparatif : Enchaînement d'actions asynchrones

#### Avec les Promesses chaînées (`.then`) :
```javascript
chargerConfiguration()
    .then((config) => chargerDonnees(config.dbUrl))
    .then((donnees) => genererRapport(donnees))
    .then((rapport) => console.log("Rapport généré :", rapport))
    .catch((err) => console.error("Erreur dans le flux :", err));
```

#### Avec `async` / `await` (beaucoup plus lisible) :
```javascript
async function executerFlux() {
    try {
        const config = await chargerConfiguration();
        const donnees = await chargerDonnees(config.dbUrl);
        const rapport = await genererRapport(donnees);
        console.log("Rapport généré :", rapport);
    } catch (err) {
        console.error("Erreur dans le flux :", err);
    }
}
executerFlux();
```

---

## 5. Exécution parallèle avec `Promise.all()`
Parfois, on ne veut pas attendre qu'une tâche se termine pour commencer la suivante. Si nous voulons charger les profils de 3 utilisateurs différents, nous pouvons le faire en parallèle.

```javascript
async function chargerPlusieursUtilisateurs() {
    console.log("Début du chargement parallèle...");
    const debut = Date.now();

    try {
        // Déclenche les 3 requêtes en même temps
        const promesses = [
            obtenirUtilisateur(1),
            obtenirUtilisateur(2),
            obtenirUtilisateur(1)
        ];

        // Attend que TOUTES les promesses soient résolues
        const [user1, user2, user3] = await Promise.all(promesses);
        
        console.log(`Utilisateurs récupérés : ${user1.name}, ${user2.name}, ${user3.name}`);
        console.log(`Temps total écoulé : ${(Date.now() - debut) / 1000} secondes.`);
    } catch (erreur) {
        console.error("L'une des requêtes a échoué :", erreur.message);
    }
}

chargerPlusieursUtilisateurs();
```

**Pourquoi c'est puissant :**
Bien que chaque appel prenne 2 secondes, l'exécution totale prend seulement **2 secondes** (au lieu de 6 secondes si nous avions mis `await` devant chaque appel de manière séquentielle !).
