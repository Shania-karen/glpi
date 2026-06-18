# Reset de la configuration UI

## 🎯 Objectif
Ce fichier décrit une fonction utilitaire **`resetAppConfig`** qui remet à zéro les préférences de couleur et de traduction de l'application, puis montre comment l'intégrer dans un composant React.

---

### 📜 Fonction de remise à zéro
```javascript
/**
 * Réinitialise les paramètres d'affichage et de langue de l'application.
 *
 * @param {Object} params
 * @param {Function} params.setColorScheme  – Setter du contexte ou state de la palette de couleurs.
 * @param {Function} params.setLocale       – Setter du contexte ou state de la langue.
 */
export const resetAppConfig = ({ setColorScheme, setLocale }) => {
  // 1️⃣ Réinitialiser la couleur (exemple : valeur par défaut "light")
  localStorage.removeItem('appColorScheme');
  if (typeof setColorScheme === 'function') {
    setColorScheme('light'); // valeur par défaut du thème
  }

  // 2️⃣ Réinitialiser la langue (exemple : valeur par défaut "en")
  localStorage.removeItem('appLocale');
  if (typeof setLocale === 'function') {
    setLocale('en'); // langue anglaise par défaut
  }

  console.info('✅ Configuration réinitialisée (couleur & traduction)');
};
```

---

## 🖼️ Exemple d’utilisation dans un composant React
```jsx
import React, { useContext } from 'react';
import { ThemeContext } from '../contexts/ThemeContext'; // contexte qui expose setColorScheme
import { LocaleContext } from '../contexts/LocaleContext'; // contexte qui expose setLocale
import { resetAppConfig } from '../utils/resetConfig'; // ← chemin vers la fonction ci‑dessus

const SettingsResetButton = () => {
  const { setColorScheme } = useContext(ThemeContext);
  const { setLocale } = useContext(LocaleContext);

  const handleReset = () => {
    resetAppConfig({ setColorScheme, setLocale });
    // Vous pouvez ajouter une toast/notification ici si souhaité
  };

  return (
    <button
      onClick={handleReset}
      style={{
        padding: '0.5rem 1rem',
        background: 'var(--primary-gradient)',
        color: 'white',
        border: 'none',
        borderRadius: '0.4rem',
        cursor: 'pointer',
        transition: 'transform 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
      onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
    >
      Réinitialiser les paramètres
    </button>
  );
};

export default SettingsResetButton;
```

---

## ✅ Points clés
- **Persisté** : les préférences sont stockées dans `localStorage`; la fonction les supprime donc complètement.
- **Réactivité** : grâce aux setters du contexte (`setColorScheme`, `setLocale`), l’UI se met à jour instantanément.
- **Extensible** : ajoutez d’autres clés (`appFontSize`, `appLayout`, …) en suivant le même schéma.

---

## 📦 Intégration rapide
1. Placez la fonction dans `src/utils/resetConfig.js` (ou `.tsx` selon votre stack).
2. Importez‑la où vous avez besoin d’un bouton de remise à zéro, comme montré ci‑dessus.
3. Assurez‑vous que vos contextes `ThemeContext` et `LocaleContext` exposent les setters mentionnés.

Vous avez maintenant un moyen élégant et centralisé de remettre à zéro la configuration couleur et traduction de l’application.
