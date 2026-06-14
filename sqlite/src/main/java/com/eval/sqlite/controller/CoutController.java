package com.eval.sqlite.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.eval.sqlite.model.Cout;
import com.eval.sqlite.repository.CoutRepository;

/**
 * Contrôleur REST unifié pour la table "couts".
 * Remplace SuperCoutController + OuvertureCostController.
 *
 * Endpoints :
 *   GET    /api/couts                            → liste complète
 *   GET    /api/couts/byTicket/{idTicket}        → tous les couts d'un ticket
 *   GET    /api/couts/byType/{typeCout}          → filtre par type
 *   GET    /api/couts/latest/{idTicket}/{type}   → dernier cout (MAX grp)
 *   POST   /api/couts                            → créer un enregistrement
 *   DELETE /api/couts/{id}                       → supprimer par id_Auto
 *   DELETE /api/couts/byTicket/{idTicket}        → supprimer tous les couts d'un ticket
 *   DELETE /api/couts/byTicketAndType/{idTicket}/{type} → supprimer par ticket+type
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(
    origins = "http://localhost:5173",
    allowedHeaders = "*",
    methods = { RequestMethod.GET, RequestMethod.POST, RequestMethod.DELETE, RequestMethod.OPTIONS }
)
public class CoutController {

    @Autowired
    private CoutRepository coutRepository;

    // ─── GET ────────────────────────────────────────────────────────────────

    /** Liste complète */
    @GetMapping("/couts")
    public List<Cout> getAll() {
        return coutRepository.findAll();
    }

    /** Tous les couts liés à un ticket */
    @GetMapping("/couts/byTicket/{idTicket}")
    public List<Cout> getByTicket(@PathVariable Long idTicket) {
        return coutRepository.findByIdTicket(idTicket);
    }

    /** Filtre par type ("reouverture", "Supercout", "glpi") */
    @GetMapping("/couts/byType/{typeCout}")
    public List<Cout> getByType(@PathVariable String typeCout) {
        return coutRepository.findByTypeCout(typeCout);
    }

    /**
     * Dernier enregistrement pour un ticket + type donné.
     * Utilise MAX(grp) — grp est un timestamp milliseconde généré côté front.
     */
    @GetMapping("/couts/latest/{idTicket}/{typeCout}")
    public ResponseEntity<Cout> getLatest(
            @PathVariable Long idTicket,
            @PathVariable String typeCout) {
        Optional<Cout> result = coutRepository.findLatestByIdTicketAndTypeCout(idTicket, typeCout);
        return result.map(ResponseEntity::ok)
                     .orElse(ResponseEntity.notFound().build());
    }

    /**
     * TOUTES les lignes du DERNIER groupe (MAX grp) pour un ticket+type.
     * Utilisé côté front pour construire les lignes d'annulation
     * (on crée des lignes négatives, on ne supprime rien).
     *
     * GET /api/couts/latestGroup/{idTicket}/{typeCout}
     */
    @GetMapping("/couts/latestGroup/{idTicket}/{typeCout}")
    public List<Cout> getLatestGroup(
            @PathVariable Long idTicket,
            @PathVariable String typeCout) {
        return coutRepository.findAllLatestGroupByIdTicketAndTypeCout(idTicket, typeCout);
    }

    // ─── POST ───────────────────────────────────────────────────────────────

    /**
     * Créer un nouvel enregistrement de cout.
     * Le timestamp (grp) doit être fourni par le frontend.
     * Si grp est absent, on le génère côté serveur en fallback.
     */
    @PostMapping("/couts")
    public Cout create(@RequestBody Cout cout) {
        if (cout.getGrp() == null) {
            cout.setGrp(System.currentTimeMillis());
        }
        return coutRepository.save(cout);
    }

    // ─── DELETE ─────────────────────────────────────────────────────────────

    /** Supprimer par id_Auto */
    @DeleteMapping("/couts/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable Long id) {
        if (coutRepository.existsById(id)) {
            coutRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    /** Supprimer tous les couts d'un ticket */
    @DeleteMapping("/couts/byTicket/{idTicket}")
    public ResponseEntity<Void> deleteByTicket(@PathVariable Long idTicket) {
        List<Cout> list = coutRepository.findByIdTicket(idTicket);
        if (list.isEmpty()) return ResponseEntity.notFound().build();
        coutRepository.deleteAll(list);
        return ResponseEntity.ok().build();
    }

    /** Supprimer les couts d'un ticket pour un type précis */
    @DeleteMapping("/couts/byTicketAndType/{idTicket}/{typeCout}")
    public ResponseEntity<Void> deleteByTicketAndType(
            @PathVariable Long idTicket,
            @PathVariable String typeCout) {
        List<Cout> list = coutRepository.findByIdTicketAndTypeCout(idTicket, typeCout);
        if (list.isEmpty()) return ResponseEntity.notFound().build();
        coutRepository.deleteAll(list);
        return ResponseEntity.ok().build();
    }

    /**
     * Supprime TOUTES les lignes du DERNIER groupe (MAX grp) pour un ticket+type.
     * Utilisé lors de l'annulation : on efface uniquement l'événement le plus récent,
     * pas tout l'historique.
     *
     * DELETE /api/couts/latestByTicketAndType/{idTicket}/{typeCout}
     */
    @DeleteMapping("/couts/latestByTicketAndType/{idTicket}/{typeCout}")
    public ResponseEntity<Void> deleteLatestGroup(
            @PathVariable Long idTicket,
            @PathVariable String typeCout) {
        List<Cout> latestGroup = coutRepository.findAllLatestGroupByIdTicketAndTypeCout(idTicket, typeCout);
        if (latestGroup.isEmpty()) return ResponseEntity.notFound().build();
        coutRepository.deleteAll(latestGroup);
        return ResponseEntity.ok().build();
    }
}
