# Guide d'implémentation — Création de Ticket depuis une Carte Équipement (Front Office)

Ce guide décrit comment ajouter un bouton **"Créer un Ticket"** sur chaque carte d'équipement dans la liste du Front Office (`AssetList.jsx`), et pré-remplir automatiquement cet équipement dans le formulaire de création de ticket (`TicketCreate.jsx`).

---

## 1. Principe de Fonctionnement

1. **Sur la carte d'un élément** (dans `AssetList.jsx`) : L'utilisateur clique sur le bouton "Ajouter Ticket".
2. **Navigation avec État (Context)** : Nous naviguons vers la page `/tickets/create` en transmettant l'identifiant et le type de l'équipement dans l'état de navigation (`state` de React Router).
3. **Pré-sélection automatique** (dans `TicketCreate.jsx`) : À l'initialisation du formulaire, on vérifie si un équipement a été transmis dans l'état. Si oui, nous l'ajoutons par défaut dans le tableau des éléments sélectionnés (`items_ids`).

---

## 2. Étape 1 : Modifier `AssetList.jsx` (Front Office)

Dans [AssetList.jsx](file:///d:/shania/itu/L3/glpi/deskflow/src/pages/frontoffice/AssetList.jsx), nous devons importer `useNavigate` pour rediriger l'utilisateur vers le formulaire avec l'état de l'équipement pré-sélectionné.

### 2.1. Code à insérer dans le composant `AssetList`
Ajoutez d'abord la navigation en haut du composant :
```javascript
const navigate = useNavigate();

const handleCreateTicketForAsset = (asset) => {
  navigate('/tickets/create', {
    state: {
      preselectedAsset: {
        id: asset.id,
        itemtype: asset._itemtype || 'Computer' // Type par défaut si manquant
      }
    }
  });
};
```

### 2.2. Ajouter le bouton d'action sur la Carte
Dans le JSX de la carte (à l'intérieur du `.map` qui génère les cartes d'éléments), ajoutez le bouton d'action sous les informations existantes :

```jsx
<div className="mt-4 pt-4 border-t border-neutral-100 flex justify-end">
  <Button 
    size="sm" 
    variant="outline" 
    onClick={(e) => {
      e.stopPropagation(); // Évite de déclencher un clic sur toute la carte
      handleCreateTicketForAsset(item);
    }}
  >
    Déclarer un incident / Ticket
  </Button>
</div>
```

---

## 3. Étape 2 : Modifier `TicketCreate.jsx` (Formulaire)

Dans [TicketCreate.jsx](file:///d:/shania/itu/L3/glpi/deskflow/src/pages/frontoffice/TicketCreate.jsx), nous devons intercepter l'état de navigation au démarrage de la page et l'injecter dans l'état du formulaire (`formData`).

### 3.1. Importer `useLocation`
Modifiez l'import en haut du fichier :
```javascript
import { useNavigate, useLocation } from 'react-router-dom';
```

### 3.2. Intercepter l'état à l'initialisation du formulaire
Modifiez l'initialisation du `formData` de la ligne 15 pour vérifier si un élément est pré-sélectionné :

**Code original :**
```javascript
const [formData, setFormData] = useState({ ...initialFormData });
```

**Code de remplacement :**
```javascript
const location = useLocation();
const preselected = location.state?.preselectedAsset;

const [formData, setFormData] = useState(() => {
  const init = { ...initialFormData };
  if (preselected) {
    // Le formulaire attend le format exact JSON stringifié pour items_ids
    init.items_ids = [JSON.stringify({ id: preselected.id, itemtype: preselected.itemtype })];
  }
  return init;
});
```

---

## 4. Avantages de cette Implémentation
* **Fluidité utilisateur (UX)** : L'utilisateur n'a pas à rechercher à nouveau son équipement dans le formulaire multi-sélections, il est déjà sélectionné.
* **Intégrité de la liaison** : Utilise le format de données natif attendu par le contrôleur de soumission (`items_ids` stringifiés), évitant toute erreur d'incompatibilité API.
