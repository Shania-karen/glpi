# Scénario Probable d'Évaluation : Système de Budget et d'Alerte Dépassement Coûts par Équipement

Ce guide détaille la conception et l'implémentation d'un **système hybride GLPI & SQLite** très probable en examen : le contrôle du budget annuel de maintenance par équipement (`Asset`), avec alertes en cas de dépassement des coûts de tickets associés.

---

## 💡 Description du Scénario
Un équipement (ordinateur, moniteur, etc.) possède un budget de maintenance annuel défini localement dans la base SQLite.
Lors de l'affichage des détails de l'équipement dans le frontend :
1. L'application récupère son budget dans SQLite (ou propose de le définir s'il n'existe pas).
2. Elle calcule le coût cumulé de tous les tickets associés à cet équipement via l'API GLPI.
3. Si le coût total dépasse le budget, une **Alerte Rouge** s'affiche et l'événement est enregistré automatiquement dans la table `budget_alerts` de SQLite.

---

## 🛠️ Partie 1 : Backend Spring Boot & SQLite

### 1. Entité JPA : Budget de l'Équipement (`AssetBudget.java`)
*Fichier :* `sqlite/src/main/java/com/eval/sqlite/model/AssetBudget.java`
```java
package com.eval.sqlite.model;

import jakarta.persistence.*;

@Entity
@Table(name = "asset_budgets")
public class AssetBudget {

    @Id
    @Column(name = "asset_serial") // Utiliser le numéro de série ou l'ID unique de l'asset
    private String assetSerial;

    @Column(name = "asset_name", nullable = false)
    private String assetName;

    @Column(nullable = false)
    private Double annualBudget;

    public AssetBudget() {}

    public AssetBudget(String assetSerial, String assetName, Double annualBudget) {
        this.assetSerial = assetSerial;
        this.assetName = assetName;
        this.annualBudget = annualBudget;
    }

    // Getters / Setters
    public String getAssetSerial() { return assetSerial; }
    public void setAssetSerial(String assetSerial) { this.assetSerial = assetSerial; }
    public String getAssetName() { return assetName; }
    public void setAssetName(String assetName) { this.assetName = assetName; }
    public Double getAnnualBudget() { return annualBudget; }
    public void setAnnualBudget(Double annualBudget) { this.annualBudget = annualBudget; }
}
```

### 2. Entité JPA : Historique d'Alertes (`BudgetAlert.java`)
*Fichier :* `sqlite/src/main/java/com/eval/sqlite/model/BudgetAlert.java`
```java
package com.eval.sqlite.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "budget_alerts")
public class BudgetAlert {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "asset_serial", nullable = false)
    private String assetSerial;

    @Column(name = "total_cost", nullable = false)
    private Double totalCost;

    @Column(name = "budget_limit", nullable = false)
    private Double budgetLimit;

    @Column(name = "alert_date")
    private LocalDateTime alertDate;

    public BudgetAlert() {
        this.alertDate = LocalDateTime.now();
    }

    public BudgetAlert(String assetSerial, Double totalCost, Double budgetLimit) {
        this.assetSerial = assetSerial;
        this.totalCost = totalCost;
        this.budgetLimit = budgetLimit;
        this.alertDate = LocalDateTime.now();
    }

    // Getters / Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getAssetSerial() { return assetSerial; }
    public void setAssetSerial(String assetSerial) { this.assetSerial = assetSerial; }
    public Double getTotalCost() { return totalCost; }
    public void setTotalCost(Double totalCost) { this.totalCost = totalCost; }
    public Double getBudgetLimit() { return budgetLimit; }
    public void setBudgetLimit(Double budgetLimit) { this.budgetLimit = budgetLimit; }
    public LocalDateTime getAlertDate() { return alertDate; }
    public void setAlertDate(LocalDateTime alertDate) { this.alertDate = alertDate; }
}
```

### 3. Les Repositories JPA
```java
// Dans com.eval.sqlite.repository.AssetBudgetRepository
public interface AssetBudgetRepository extends JpaRepository<AssetBudget, String> {}

// Dans com.eval.sqlite.repository.BudgetAlertRepository
public interface BudgetAlertRepository extends JpaRepository<BudgetAlert, Long> {
    List<BudgetAlert> findByAssetSerialOrderByAlertDateDesc(String assetSerial);
}
```

### 4. Contrôleur REST (`BudgetController.java`)
*Fichier :* `sqlite/src/main/java/com/eval/sqlite/controller/BudgetController.java`
```java
package com.eval.sqlite.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.eval.sqlite.model.AssetBudget;
import com.eval.sqlite.model.BudgetAlert;
import com.eval.sqlite.repository.AssetBudgetRepository;
import com.eval.sqlite.repository.BudgetAlertRepository;
import java.util.List;
import java.util.Optional;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    @Autowired
    private AssetBudgetRepository budgetRepository;

    @Autowired
    private BudgetAlertRepository alertRepository;

    // Récupérer le budget d'un asset
    @GetMapping("/{serial}")
    public Optional<AssetBudget> getBudget(@PathVariable String serial) {
        return budgetRepository.findById(serial);
    }

    // Définir ou modifier un budget
    @PostMapping
    public AssetBudget saveBudget(@RequestBody AssetBudget budget) {
        return budgetRepository.save(budget);
    }

    // Récupérer l'historique des alertes pour un asset
    @GetMapping("/{serial}/alerts")
    public List<BudgetAlert> getAlerts(@PathVariable String serial) {
        return alertRepository.findByAssetSerialOrderByAlertDateDesc(serial);
    }

    // Enregistrer une nouvelle alerte de dépassement
    @PostMapping("/alerts")
    public BudgetAlert triggerAlert(@RequestBody BudgetAlert alert) {
        // Optionnel : éviter les doublons d'alertes trop rapprochées
        return alertRepository.save(alert);
    }
}
```

---

## ⚡ Partie 2 : Logique et Utilitaires JavaScript (Frontend React)

Ces fonctions doivent être stockées dans un module utilitaire (ex : `docs/utility_functions_guide.md` ou `src/utils/budgetUtils.js`).

### 1. Fonction pure de calcul des coûts associés à un Asset
Cette fonction filtre les tickets pour ne garder que ceux qui sont liés à un numéro de série d'asset spécifique, puis additionne leurs coûts.

```javascript
/**
 * Calcule le coût cumulé des tickets associés à un asset donné.
 * @param {Array} tickets - Liste brute de tous les tickets GLPI
 * @param {string} assetSerial - Numéro de série de l'asset ciblé
 * @returns {number} Coût total cumulé
 */
export function calculateAssetTicketsTotalCost(tickets = [], assetSerial) {
  if (!assetSerial) return 0;

  return tickets.reduce((total, ticket) => {
    // Vérifier si le ticket est lié à l'asset recherché
    const isLinked = ticket.linkedItems?.some(
      item => String(item.serial).trim() === String(assetSerial).trim()
    );

    if (isLinked) {
      // Coût fixe
      const fixedCost = parseFloat(ticket.cost_fixed) || 0;
      // Coût lié au temps passé (ex: durée en sec * taux horaire)
      const durationHours = (parseFloat(ticket.actiontime) || 0) / 3600;
      const hourlyRate = parseFloat(ticket.hourly_rate) || 50; // Taux par défaut 50€/h
      const timeCost = durationHours * hourlyRate;

      return total + fixedCost + timeCost;
    }

    return total;
  }, 0);
}
```

### 2. Intégration React : Composant de Suivi de Budget (`AssetBudgetStatus.jsx`)
Ce composant gère l'état d'affichage, calcule la somme des coûts, vérifie si le budget est dépassé et envoie l'alerte au backend SQLite.

```jsx
import React, { useState, useEffect, useMemo } from 'react';
import { calculateAssetTicketsTotalCost } from '../../utils/budgetUtils';

export default function AssetBudgetStatus({ asset, tickets = [] }) {
  const [budget, setBudget] = useState(null);
  const [inputBudget, setInputBudget] = useState('');
  const [alertSent, setAlertSent] = useState(false);

  const assetSerial = asset?.serial;

  // 1. Calculer le coût total cumulé des tickets associés
  const totalTicketsCost = useMemo(() => {
    return calculateAssetTicketsTotalCost(tickets, assetSerial);
  }, [tickets, assetSerial]);

  // 2. Charger le budget depuis SQLite
  useEffect(() => {
    if (!assetSerial) return;
    fetch(`http://localhost:8081/api/budgets/${assetSerial}`)
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Aucun budget défini');
      })
      .then(data => {
        if (data) {
          setBudget(data.annualBudget);
          setInputBudget(data.annualBudget.toString());
        }
      })
      .catch(() => setBudget(null));
  }, [assetSerial]);

  // 3. Soumettre/Enregistrer un budget
  const handleSaveBudget = async () => {
    const amount = parseFloat(inputBudget);
    if (isNaN(amount) || amount <= 0) return;

    const res = await fetch('http://localhost:8081/api/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        assetSerial,
        assetName: asset.name || 'Équipement sans nom',
        annualBudget: amount
      })
    });

    if (res.ok) {
      setBudget(amount);
      alert('Budget enregistré avec succès !');
    }
  };

  // 4. Envoi automatique de l'alerte à SQLite en cas de dépassement
  useEffect(() => {
    if (budget && totalTicketsCost > budget && !alertSent) {
      fetch('http://localhost:8081/api/budgets/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetSerial,
          totalCost: totalTicketsCost,
          budgetLimit: budget
        })
      }).then(res => {
        if (res.ok) {
          setAlertSent(true);
          console.log('Alerte de dépassement enregistrée dans SQLite !');
        }
      });
    }
  }, [budget, totalTicketsCost, assetSerial, alertSent]);

  return (
    <div className="p-4 border rounded-lg bg-white shadow-sm space-y-4">
      <h3 className="font-bold text-lg">Contrôle Financier de la Maintenance</h3>

      {budget === null ? (
        <div className="space-y-2">
          <p className="text-sm text-yellow-600">⚠️ Aucun budget annuel défini pour cet équipement dans SQLite.</p>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Ex: 500"
              className="p-1.5 border rounded w-32"
              value={inputBudget}
              onChange={(e) => setInputBudget(e.target.value)}
            />
            <button onClick={handleSaveBudget} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
              Définir le Budget
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Budget Annuel :</span>
            <strong className="font-mono">{budget.toFixed(2)} €</strong>
          </div>
          <div className="flex justify-between text-sm">
            <span>Coûts de maintenance cumulés :</span>
            <strong className="font-mono">{totalTicketsCost.toFixed(2)} €</strong>
          </div>

          {/* Rendu dynamique de l'alerte en cas de dépassement */}
          {totalTicketsCost > budget ? (
            <div className="p-3 bg-red-100 text-red-800 rounded-md border border-red-200">
              <p className="font-bold text-sm">❌ Budget Dépassé !</p>
              <p className="text-xs">Dépassement de : +{(totalTicketsCost - budget).toFixed(2)} €</p>
              <p className="text-[10px] text-red-500 italic mt-1">Alerte enregistrée dans l'historique SQLite.</p>
            </div>
          ) : (
            <div className="p-3 bg-green-100 text-green-800 rounded-md border border-green-200 text-xs">
              ✅ Dépenses sous contrôle. Marge disponible : {(budget - totalTicketsCost).toFixed(2)} €
            </div>
          )}

          {/* Permet de modifier le budget existant */}
          <details className="mt-2 text-xs">
            <summary className="cursor-pointer text-gray-500 hover:text-gray-700">Modifier le budget</summary>
            <div className="flex gap-2 mt-2">
              <input
                type="number"
                className="p-1 border rounded w-24"
                value={inputBudget}
                onChange={(e) => setInputBudget(e.target.value)}
              />
              <button onClick={handleSaveBudget} className="px-2 py-1 bg-gray-600 text-white rounded">
                Mettre à jour
              </button>
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
```
