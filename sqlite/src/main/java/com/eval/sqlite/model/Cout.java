package com.eval.sqlite.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * Table unifiée "couts" remplaçant superCout + ouvertureCost.
 *
 * Colonnes :
 *  - id_Auto     : clé primaire auto-générée
 *  - id_Ticket   : ID du ticket GLPI concerné
 *  - type_cout   : "reouverture" | "Supercout" | "glpi"
 *  - cout        : montant (double)
 *  - id_item     : ID de l'élément (asset) lié
 *  - category    : catégorie du ticket (stockée en base, pas appelée via API)
 *  - grp         : groupe (utilisé comme clé de tri — on stocke le timestamp
 *                  généré côté front pour retrouver le dernier enregistrement
 *                  via MAX(grp))
 */
@Entity
@Table(name = "couts")
public class Cout {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long idAuto;

    private Long   idTicket;
    private String typeCout;   // "reouverture" | "Supercout" | "glpi"
    private double cout;
    private Long   idItem;
    private String category;
    private Long   grp;   
    private Integer mode;
    private Double valeur;     // timestamp en millisecondes (généré côté front)
    private Double plafond;

    public Cout() {}

    // ── Getters / Setters ──────────────────────────────────────────────────

    public Long getIdAuto() { return idAuto; }
    public void setIdAuto(Long idAuto) { this.idAuto = idAuto; }

    public Long getIdTicket() { return idTicket; }
    public void setIdTicket(Long idTicket) { this.idTicket = idTicket; }

    public String getTypeCout() { return typeCout; }
    public void setTypeCout(String typeCout) { this.typeCout = typeCout; }

    public double getCout() { return cout; }
    public void setCout(double cout) { this.cout = cout; }

    public Long getIdItem() { return idItem; }
    public void setIdItem(Long idItem) { this.idItem = idItem; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public Long getGrp() { return grp; }
    public void setGrp(Long grp) { this.grp = grp; }

    public Integer getMode() {
        return mode;
    }

    public void setMode(Integer mode) {
        this.mode = mode;
    }

    public Double getValeur() {
        return valeur;
    }

    public void setValeur(Double valeur) {
        this.valeur = valeur;
    }

    public Double getPlafond(){ return plafond;}
    public void setPlafond(Double plafond){this.plafond=plafond;}


}
