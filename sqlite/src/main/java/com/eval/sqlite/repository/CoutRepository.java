package com.eval.sqlite.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.eval.sqlite.model.Cout;

@Repository
public interface CoutRepository extends JpaRepository<Cout, Long> {

    /** Tous les enregistrements pour un ticket donné */
    List<Cout> findByIdTicket(Long idTicket);

    /** Filtre par type (reouverture / Supercout / glpi) */
    List<Cout> findByTypeCout(String typeCout);

    /** Filtre par ticket ET type */
    List<Cout> findByIdTicketAndTypeCout(Long idTicket, String typeCout);

    /** Filtre par item */
    List<Cout> findByIdItem(Long idItem);

    @Query("SELECT SUM(cout) FROM Cout c WHERE c.idTicket= :idTicket AND c.typeCout = :typeCout")
    Double findSumByIdTicketAndTypeCout(
        @Param("idTicket") Long idTicket,
        @Param("typeCout") String typeCout
    );

    @Query("SELECT SUM(c.cout) / COUNT(DISTINCT c.grp) FROM Cout c WHERE c.idTicket = :idTicket AND c.typeCout = :typeCout")
    Double findAverageByIdTicketAndTypeCout(
        @Param("idTicket") Long idTicket,
        @Param("typeCout") String typeCout
    );
  
    @Query("SELECT c FROM Cout c WHERE c.idTicket = :idTicket AND c.typeCout = :typeCout AND c.grp = (SELECT MAX(c2.grp) FROM Cout c2 WHERE c2.idTicket = :idTicket AND c2.typeCout = :typeCout)")
    Optional<Cout> findLatestByIdTicketAndTypeCout(
        @Param("idTicket") Long idTicket,
        @Param("typeCout") String typeCout
    );

      @Query("SELECT c FROM Cout c WHERE c.idTicket = :idTicket AND c.typeCout = :typeCout AND c.grp = (SELECT MIN(c2.grp) FROM Cout c2 WHERE c2.idTicket = :idTicket AND c2.typeCout = :typeCout)")
    Optional<Cout> findFirstByIdTicketAndTypeCout(
        @Param("idTicket") Long idTicket,
        @Param("typeCout") String typeCout
    );

    /**
     * Toutes les lignes du DERNIER groupe (même MAX grp) pour un ticket+type.
     * Utilisé pour annuler : on supprime toutes les lignes du dernier événement.
     */
    @Query("SELECT c FROM Cout c WHERE c.idTicket = :idTicket AND c.typeCout = :typeCout AND c.grp = (SELECT MAX(c2.grp) FROM Cout c2 WHERE c2.idTicket = :idTicket AND c2.typeCout = :typeCout)")
    List<Cout> findAllLatestGroupByIdTicketAndTypeCout(
        @Param("idTicket") Long idTicket,
        @Param("typeCout") String typeCout
    );

       @Query("SELECT c FROM Cout c WHERE c.idTicket = :idTicket AND c.typeCout = :typeCout AND c.grp = (SELECT MIN(c2.grp) FROM Cout c2 WHERE c2.idTicket = :idTicket AND c2.typeCout = :typeCout)")
    List<Cout> findAllFirstGroupByIdTicketAndTypeCout(
        @Param("idTicket") Long idTicket,
        @Param("typeCout") String typeCout
    );

      @Query("SELECT MIN(c.grp) FROM Cout c WHERE c.idTicket = :idTicket AND c.typeCout = :typeCout")
    Optional<Long> findMinGrpByIdTicketAndTypeCout(
        @Param("idTicket") Long idTicket,
        @Param("typeCout") String typeCout
    );



    /**
     * MAX(grp) pour un ticket+type — retourne le timestamp du dernier groupe.
     */
    @Query("SELECT MAX(c.grp) FROM Cout c WHERE c.idTicket = :idTicket AND c.typeCout = :typeCout")
    Optional<Long> findMaxGrpByIdTicketAndTypeCout(
        @Param("idTicket") Long idTicket,
        @Param("typeCout") String typeCout
    );
}
