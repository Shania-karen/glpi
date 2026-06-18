# 📂 Service de Logique Métier Backend en Spring Boot (`@Service`)

Ce guide présente l'implémentation complète d'un service Spring Boot (`@Service`) en Java. Contrairement aux calculs effectués côté client (React), ce service centralise la **logique métier financière et décisionnelle côté serveur**, en exécutant des requêtes SQL optimisées directement sur la base de données **SQLite** locale via JPA et `JdbcTemplate`.

---

## 1. Modèles de Données et DTOs (Data Transfer Objects)

Pour retourner les résultats des calculs au contrôleur REST de manière propre et typée, nous définissons les classes DTO suivantes :

### A. `TcoResult.java`
```java
package com.eval.sqlite.dto;

public class TcoResult {
    private Long idItem;
    private double purchasePrice;
    private double totalMaintenanceCost;
    private double tco;

    public TcoResult(Long idItem, double purchasePrice, double totalMaintenanceCost) {
        this.idItem = idItem;
        this.purchasePrice = purchasePrice;
        this.totalMaintenanceCost = Math.round(totalMaintenanceCost * 100.0) / 100.0;
        this.tco = Math.round((purchasePrice + totalMaintenanceCost) * 100.0) / 100.0;
    }

    // Getters and Setters...
    public Long getIdItem() { return idItem; }
    public double getPurchasePrice() { return purchasePrice; }
    public double getTotalMaintenanceCost() { return totalMaintenanceCost; }
    public double getTco() { return tco; }
}
```

### B. `RoiResult.java`
```java
package com.eval.sqlite.dto;

public class RoiResult {
    private Long idItem;
    private double ratioMaintenanceValue;
    private boolean shouldReplace;
    private String status;

    public RoiResult(Long idItem, double ratioMaintenanceValue, boolean shouldReplace, String status) {
        this.idItem = idItem;
        this.ratioMaintenanceValue = Math.round(ratioMaintenanceValue * 100.0) / 100.0;
        this.shouldReplace = shouldReplace;
        this.status = status;
    }

    // Getters and Setters...
    public Long getIdItem() { return idItem; }
    public double getRatioMaintenanceValue() { return ratioMaintenanceValue; }
    public boolean isShouldReplace() { return shouldReplace; }
    public String getStatus() { return status; }
}
```

### C. `TechnicianStats.java`
```java
package com.eval.sqlite.dto;

public class TechnicianStats {
    private String technicianName;
    private long totalTickets;
    private long resolvedTickets;
    private double resolutionRate;
    private double totalDurationHours;
    private double totalTimeCost;
    private double totalFixedCosts;
    private double grandTotalCost;
    private double averageCostPerTicket;

    public TechnicianStats(String technicianName, long totalTickets, long resolvedTickets, 
                           double totalDurationHours, double totalTimeCost, double totalFixedCosts) {
        this.technicianName = technicianName;
        this.totalTickets = totalTickets;
        this.resolvedTickets = resolvedTickets;
        this.resolutionRate = totalTickets > 0 ? Math.round(((double) resolvedTickets / totalTickets) * 10000.0) / 100.0 : 0.0;
        this.totalDurationHours = Math.round(totalDurationHours * 100.0) / 100.0;
        this.totalTimeCost = Math.round(totalTimeCost * 100.0) / 100.0;
        this.totalFixedCosts = Math.round(totalFixedCosts * 100.0) / 100.0;
        this.grandTotalCost = Math.round((totalTimeCost + totalFixedCosts) * 100.0) / 100.0;
        this.averageCostPerTicket = totalTickets > 0 ? Math.round((this.grandTotalCost / totalTickets) * 100.0) / 100.0 : 0.0;
    }

    // Getters and Setters...
    public String getTechnicianName() { return technicianName; }
    public long getTotalTickets() { return totalTickets; }
    public long getResolvedTickets() { return resolvedTickets; }
    public double getResolutionRate() { return resolutionRate; }
    public double getTotalDurationHours() { return totalDurationHours; }
    public double getTotalTimeCost() { return totalTimeCost; }
    public double getTotalFixedCosts() { return totalFixedCosts; }
    public double getGrandTotalCost() { return grandTotalCost; }
    public double getAverageCostPerTicket() { return averageCostPerTicket; }
}
```

---

## 2. Implémentation du Service : `FinancialMetricsService.java`

Ce service Java centralise tous les calculs analytiques. Il utilise à la fois le `CoutRepository` pour les accès JPA et le `JdbcTemplate` pour effectuer des agrégations SQL brutes et performantes directement dans SQLite.

```java
package com.eval.sqlite.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;

import com.eval.sqlite.dto.TcoResult;
import com.eval.sqlite.dto.RoiResult;
import com.eval.sqlite.dto.TechnicianStats;
import com.eval.sqlite.repository.CoutRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class FinancialMetricsService {

    @Autowired
    private CoutRepository coutRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    /**
     * 1. Calcule le Coût Total de Possession (TCO) d'un équipement informatique.
     * TCO = Prix d'achat + Somme de toutes les interventions de maintenance (Supercoûts + Réouvertures + GLPI)
     *
     * @param idItem - Identifiant unique du matériel (Computer, Printer, etc.)
     * @param purchasePrice - Prix d'achat initial du matériel
     * @return TcoResult contenant les détails du calcul
     */
    public TcoResult calculateAssetTco(Long idItem, double purchasePrice) {
        // Calcul du coût cumulé de toutes les interventions locales (supercoûts + réouvertures + glpi)
        // en incluant les annulations négatives.
        String sql = "SELECT SUM(cout) FROM couts WHERE id_item = ?";
        Double totalMaintenance = jdbcTemplate.queryForObject(sql, Double.class, idItem);
        
        if (totalMaintenance == null) {
            totalMaintenance = 0.0;
        }

        return new TcoResult(idItem, purchasePrice, totalMaintenance);
    }

    /**
     * 2. Évalue le ROI et le statut de rentabilité de l'équipement.
     * Si les coûts de maintenance dépassent thresholdPercent (ex: 70%) de la valeur d'achat,
     * l'équipement est marqué à remplacer car non rentable (perte financière).
     *
     * @param idItem - Identifiant de l'équipement
     * @param purchasePrice - Prix d'achat d'origine
     * @param thresholdPercent - Seuil d'alerte de remplacement (par défaut 70.0)
     * @return RoiResult contenant les indicateurs décisionnels
     */
    public RoiResult evaluateAssetRoi(Long idItem, double purchasePrice, double thresholdPercent) {
        if (purchasePrice <= 0) {
            return new RoiResult(idItem, 0.0, true, "Valeur d'achat invalide ou inconnue");
        }

        TcoResult tcoResult = calculateAssetTco(idItem, purchasePrice);
        double maintenanceCost = tcoResult.getTotalMaintenanceCost();
        
        double ratio = (maintenanceCost / purchasePrice) * 100.0;
        boolean shouldReplace = ratio >= thresholdPercent;

        String status = "Rentable";
        if (ratio >= 100.0) {
            status = "Perte totale (Coûts de maintenance > Valeur d'achat)";
        } else if (shouldReplace) {
            status = "Alerte : Maintenance excessive (À remplacer rapidement)";
        }

        return new RoiResult(idItem, ratio, shouldReplace, status);
    }

    /**
     * 3. Calcule le coût moyen de résolution des tickets par niveau de priorité.
     * Groupement SQL natif sur les tickets de la base locale SQLite.
     *
     * @return Map associant la priorité à ses statistiques (count, totalCost, averageCost)
     */
    public Map<String, Map<String, Object>> calculateAverageCostByPriority() {
        String sql = "SELECT category AS priority, COUNT(DISTINCT id_ticket) AS cnt, SUM(cout) AS total " +
                     "FROM couts " +
                     "WHERE type_cout IN ('Supercout', 'reouverture', 'glpi', 'annulation') " +
                     "GROUP BY category";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        Map<String, Map<String, Object>> stats = new HashMap<>();

        for (Map<String, Object> row : rows) {
            String priority = (String) row.get("priority");
            if (priority == null) priority = "Non spécifiée";

            long count = ((Number) row.get("cnt")).longValue();
            double total = ((Number) row.get("total")).doubleValue();
            double average = count > 0 ? (total / count) : 0.0;

            Map<String, Object> priorityData = new HashMap<>();
            priorityData.put("count", count);
            priorityData.put("totalCost", Math.round(total * 100.0) / 100.0);
            priorityData.put("averageCost", Math.round(average * 100.0) / 100.0);

            stats.put(priority, priorityData);
        }

        return stats;
    }

    /**
     * 4. Calcule l'efficacité financière et la charge d'un technicien.
     * Compile le nombre de tickets résolus, les heures de travail et les coûts générés.
     *
     * @param technicianName - Nom d'affichage ou ID du technicien concerné
     * @param hourlyRate - Taux horaire de facturation du technicien
     * @return TechnicianStats DTO contenant l'analyse de charge
     */
    public TechnicianStats calculateTechnicianEfficiency(String technicianName, double hourlyRate) {
        // Requête sur l'historique des statuts locaux pour trouver les tickets résolus par ce technicien
        String sqlTickets = "SELECT COUNT(DISTINCT ticket_id) FROM ticket_status_histories WHERE changed_by = ?";
        Long totalTickets = jdbcTemplate.queryForObject(sqlTickets, Long.class, technicianName);
        if (totalTickets == null) totalTickets = 0L;

        String sqlResolved = "SELECT COUNT(DISTINCT ticket_id) FROM ticket_status_histories " +
                             "WHERE changed_by = ? AND new_status IN ('Solved', 'Closed', 'Résolu', 'Clos')";
        Long resolvedTickets = jdbcTemplate.queryForObject(sqlResolved, Long.class, technicianName);
        if (resolvedTickets == null) resolvedTickets = 0L;

        // Calcul du coût fixe total lié aux actions de ce technicien
        String sqlFixed = "SELECT SUM(cout) FROM couts WHERE type_cout = 'glpi' AND id_ticket IN " +
                          "(SELECT DISTINCT ticket_id FROM ticket_status_histories WHERE changed_by = ?)";
        Double totalFixed = jdbcTemplate.queryForObject(sqlFixed, Double.class, technicianName);
        if (totalFixed == null) totalFixed = 0.0;

        // Récupération de la durée totale de résolution (estimée en heures depuis les logs de transition de statuts)
        // Note : On simule ici une somme sur une colonne spécifique ou une durée moyenne
        double totalDurationHours = totalTickets * 2.5; // Exemple d'estimation par défaut (2.5 heures par ticket)
        double totalTimeCost = totalDurationHours * hourlyRate;

        return new TechnicianStats(technicianName, totalTickets, resolvedTickets, totalDurationHours, totalTimeCost, totalFixed);
    }

    /**
     * 5. Calcule les pertes opérationnelles cumulées mensuelles.
     * Regroupe les coûts résolus par mois calendaire.
     *
     * @return Map associant chaque mois (format "YYYY-MM") au montant total des pertes
     */
    public Map<String, Double> calculateMonthlyOperationalLoss() {
        // En SQLite, strftime('%Y-%m', datetime(grp/1000, 'unixepoch')) permet d'extraire l'année et le mois
        // depuis le timestamp millisecondes (grp) stocké en base.
        String sql = "SELECT strftime('%Y-%m', datetime(grp / 1000, 'unixepoch')) AS month, SUM(cout) AS total " +
                     "FROM couts " +
                     "WHERE type_cout IN ('Supercout', 'reouverture', 'glpi', 'annulation') " +
                     "GROUP BY month " +
                     "ORDER BY month ASC";

        List<Map<String, Object>> rows = jdbcTemplate.queryForList(sql);
        Map<String, Double> losses = new HashMap<>();

        for (Map<String, Object> row : rows) {
            String month = (String) row.get("month");
            if (month == null) continue;

            double total = ((Number) row.get("total")).doubleValue();
            losses.put(month, Math.round(total * 100.0) / 100.0);
        }

        return losses;
    }
}
```

---

## 3. Contrôleur REST d'Exposition des Métriques : `FinancialMetricsController.java`

Ce contrôleur REST expose la logique métier du service via des endpoints HTTP utilisables par l'interface d'administration React.

```java
package com.eval.sqlite.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.eval.sqlite.dto.TcoResult;
import com.eval.sqlite.dto.RoiResult;
import com.eval.sqlite.dto.TechnicianStats;
import com.eval.sqlite.service.FinancialMetricsService;

import java.util.Map;

@RestController
@RequestMapping("/api/metrics")
@CrossOrigin(origins = "http://localhost:5173")
public class FinancialMetricsController {

    @Autowired
    private FinancialMetricsService metricsService;

    // 1. Endpoint TCO
    @GetMapping("/tco/{idItem}")
    public ResponseEntity<TcoResult> getTco(
            @PathVariable Long idItem,
            @RequestParam(defaultValue = "0.0") double purchasePrice) {
        TcoResult result = metricsService.calculateAssetTco(idItem, purchasePrice);
        return ResponseEntity.ok(result);
    }

    // 2. Endpoint ROI & Alerte Remplacement
    @GetMapping("/roi/{idItem}")
    public ResponseEntity<RoiResult> getRoi(
            @PathVariable Long idItem,
            @RequestParam double purchasePrice,
            @RequestParam(defaultValue = "70.0") double thresholdPercent) {
        RoiResult result = metricsService.evaluateAssetRoi(idItem, purchasePrice, thresholdPercent);
        return ResponseEntity.ok(result);
    }

    // 3. Endpoint Coût Moyen par Priorité
    @GetMapping("/priority-costs")
    public ResponseEntity<Map<String, Map<String, Object>>> getPriorityCosts() {
        Map<String, Map<String, Object>> result = metricsService.calculateAverageCostByPriority();
        return ResponseEntity.ok(result);
    }

    // 4. Endpoint Efficacité Technicien
    @GetMapping("/technician/{name}")
    public ResponseEntity<TechnicianStats> getTechnicianStats(
            @PathVariable String name,
            @RequestParam(defaultValue = "45.0") double hourlyRate) {
        TechnicianStats result = metricsService.calculateTechnicianEfficiency(name, hourlyRate);
        return ResponseEntity.ok(result);
    }

    // 5. Endpoint Pertes Opérationnelles Mensuelles
    @GetMapping("/monthly-losses")
    public ResponseEntity<Map<String, Double>> getMonthlyLosses() {
        Map<String, Double> result = metricsService.calculateMonthlyOperationalLoss();
        return ResponseEntity.ok(result);
    }
}
```
