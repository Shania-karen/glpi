package com.eval.sqlite.controller;

import java.util.List;
import java.util.*;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import com.eval.sqlite.model.Cout;
import com.eval.sqlite.repository.CoutRepository;

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

    @GetMapping("/couts")
    public List<Cout> getAll() {
        return coutRepository.findAll();
    }

    @GetMapping("/couts/byTicket/{idTicket}")
    public List<Cout> getByTicket(@PathVariable Long idTicket) {
        return coutRepository.findByIdTicket(idTicket);
    }

    @PutMapping("/couts/group/{grp}")
    public ResponseEntity<?> updateGroup(
        @PathVariable Long grp,
        @RequestBody Cout updatedData
    ){
        List<Cout> all = coutRepository.findAll();
        List<Cout> filtered= all.stream()
        .filter(c -> grp.equals(c.getGrp()))
        .collect(java.util.stream.Collectors.toList());
        if( filtered.isEmpty()){
            return ResponseEntity.notFound().build();
        }
        Long idTicket= filtered.get(0).getIdTicket();
        String typeCout= filtered.get(0).getTypeCout();

        if("Supercout".equalsIgnoreCase(typeCout)){
            double newTotal = updatedData.getCout();
            double costPerItem = newTotal/filtered.size();
            costPerItem= Math.round(costPerItem * 100) / 100.0;
            for( Cout row : filtered){
                row.setCout(costPerItem);
            }
        }else if("reouverture".equalsIgnoreCase(typeCout)){
            for(Cout row : filtered){
                row.setMode(updatedData.getMode());
                row.setValeur(updatedData.getValeur());
            }
        }
        coutRepository.saveAll(filtered);
        recalculateTicket(idTicket);
        return ResponseEntity.ok().build();
    }


    @GetMapping("/couts/byType/{typeCout}")
    public List<Cout> getByType(@PathVariable String typeCout) {
        return coutRepository.findByTypeCout(typeCout);
    }

    @GetMapping("/couts/latest/{idTicket}/{typeCout}")
    public ResponseEntity<Cout> getLatest(
            @PathVariable Long idTicket,
            @PathVariable String typeCout) {
        Optional<Cout> result = coutRepository.findLatestByIdTicketAndTypeCout(idTicket, typeCout);
        return result.map(ResponseEntity::ok)
                     .orElse(ResponseEntity.notFound().build());
    }

       @GetMapping("/couts/sum/{idTicket}/{typeCout}")
    public Double getSum(
            @PathVariable Long idTicket,
            @PathVariable String typeCout) {
       Double result = coutRepository.findSumByIdTicketAndTypeCout(idTicket, typeCout);
        return result;
    }

       @GetMapping("/couts/average/{idTicket}/{typeCout}")
    public Double getAverage(
            @PathVariable Long idTicket,
            @PathVariable String typeCout) {
       Double result = coutRepository.findAverageByIdTicketAndTypeCout(idTicket, typeCout);
        return result;
    }

   @GetMapping("/couts/first/{idTicket}/{typeCout}")
    public ResponseEntity<Cout> getFirst(
            @PathVariable Long idTicket,
            @PathVariable String typeCout) {
        Optional<Cout> result = coutRepository.findFirstByIdTicketAndTypeCout(idTicket, typeCout);
        return result.map(ResponseEntity::ok)
                     .orElse(ResponseEntity.notFound().build());
    }
    @GetMapping("/couts/firstGroup/{idTicket}/{typeCout}")
    public List<Cout> getFirstGroup(
            @PathVariable Long idTicket,
            @PathVariable String typeCout) {
        return coutRepository.findAllFirstGroupByIdTicketAndTypeCout(idTicket, typeCout);
    }


    @GetMapping("/couts/latestGroup/{idTicket}/{typeCout}")
    public List<Cout> getLatestGroup(
            @PathVariable Long idTicket,
            @PathVariable String typeCout) {
        return coutRepository.findAllLatestGroupByIdTicketAndTypeCout(idTicket, typeCout);
    }


    @PostMapping("/couts")
    public Cout create(@RequestBody Cout cout) {
        if (cout.getGrp() == null) {
            cout.setGrp(System.currentTimeMillis());
        }
        Cout saved=coutRepository.save(cout);
        if(cout.getIdTicket()!=null){
            recalculateTicket(cout.getIdTicket());
        }
        return saved;
    }

    @DeleteMapping("/couts/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable Long id) {
        if (coutRepository.existsById(id)) {
            coutRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

      @DeleteMapping("/couts/group/{grp}")
    public ResponseEntity<?> deleteGroup(@PathVariable Long grp) {
        List<Cout> all= coutRepository.findAll();
        List<Cout> filtered = all.stream()
        .filter(c -> grp.equals(c.getGrp()))
        .collect(java.util.stream.Collectors.toList());

        if(filtered.isEmpty()){
            return ResponseEntity.notFound().build();

        }
        Long idTicket = filtered.get(0).getIdTicket();
        coutRepository.deleteAll(filtered);
        recalculateTicket(idTicket);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/couts/byTicket/{idTicket}")
    public ResponseEntity<Void> deleteByTicket(@PathVariable Long idTicket) {
        List<Cout> list = coutRepository.findByIdTicket(idTicket);
        if (list.isEmpty()) return ResponseEntity.notFound().build();
        coutRepository.deleteAll(list);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/couts/byTicketAndType/{idTicket}/{typeCout}")
    public ResponseEntity<Void> deleteByTicketAndType(
            @PathVariable Long idTicket,
            @PathVariable String typeCout) {
        List<Cout> list = coutRepository.findByIdTicketAndTypeCout(idTicket, typeCout);
        if (list.isEmpty()) return ResponseEntity.notFound().build();
        coutRepository.deleteAll(list);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/couts/latestByTicketAndType/{idTicket}/{typeCout}")
    public ResponseEntity<Void> deleteLatestGroup(
            @PathVariable Long idTicket,
            @PathVariable String typeCout) {
        List<Cout> latestGroup = coutRepository.findAllLatestGroupByIdTicketAndTypeCout(idTicket, typeCout);
        if (latestGroup.isEmpty()) return ResponseEntity.notFound().build();
        coutRepository.deleteAll(latestGroup);
        return ResponseEntity.ok().build();
    }

    private void recalculateTicket(Long idTicket){
        List<Cout> allCouts = coutRepository.findByIdTicket(idTicket);
        if( allCouts == null || allCouts.isEmpty())
        return ;

        allCouts.sort((c1,c2) -> {
            if(c1.getGrp() == null && c2.getGrp() == null ) return 0;
            if(c1.getGrp() == null) return -1;
            if(c2.getGrp() == null) return 1;

            return c1.getGrp().compareTo(c2.getGrp());
        });

        List<Double> superCoutTotal = new java.util.ArrayList<>();
        java.util.Map<Long,List<Cout>> groups = new java.util.LinkedHashMap<>();
        for(Cout c : allCouts){
            if( c.getGrp() !=null){
                groups.computeIfAbsent(c.getGrp(), k
                ->new java.util.ArrayList<>()).add(c);
                
            }
        }

        for (java.util.Map.Entry<Long,List<Cout>> 
        entry : groups.entrySet()){
            List<Cout> groupRows = entry.getValue();
            if(groupRows.isEmpty()) continue;

            String type = groupRows.get(0).getTypeCout();
            if("Supercout".equalsIgnoreCase(type)){
                double total = groupRows.stream().
                mapToDouble(Cout::getCout).sum();
                superCoutTotal.add(total);
            }else if("reouverture".equalsIgnoreCase(type)){
            List<Cout> tickets= coutRepository.findByIdTicket(idTicket);
            double sommeSupercout = tickets.stream()
            .filter(c -> "Supercout".
            equalsIgnoreCase(c.getTypeCout()))
            .mapToDouble(Cout :: getCout)
            .sum();

            Integer mode = groupRows.get(0).getMode();
            Double valeur = groupRows.get(0).getValeur();
          //  Double plafond = groupRows.get(0).getPlafond();

            if(mode == null ) mode =1;
            if(valeur == null) valeur = 0.0;
            

            double base = 0.0;
                if(!superCoutTotal.isEmpty()){
                    if(mode ==1){
                        base = superCoutTotal.get(superCoutTotal.size()-1);
                    }
                    else if(mode ==2){
                        base =superCoutTotal.get(0);
                    }
                    else if (mode ==3){
                        double sum = 0; 
                        for (double val : superCoutTotal) sum +=val;
                        base = sum/superCoutTotal.size();
                    }
                    else if(mode ==4){
                        double sum = 0; 
                        for (double val : superCoutTotal) sum +=val;
                        base = sum;
                    }
                }
                Double plafond=0.0;
                for(Cout c : allCouts){
                    if("Supercout".equalsIgnoreCase(c.getTypeCout())&& c.getPlafond()
                    !=null){
                        plafond = c.getPlafond();
                    }
                }
                double sommeSuperCout =0.0;
                for(double val : superCoutTotal){
                    sommeSuperCout +=val;
                }
                double maxReouverture=( sommeSuperCout * plafond)/100.0;
                
                double totalReouverture = (base * valeur)/100;
                if(totalReouverture > maxReouverture){
                    totalReouverture= maxReouverture;
                    valeur = plafond;
                    
                }
                double costPerItem = totalReouverture / groupRows.size();
                costPerItem = Math.round(costPerItem * 100) / 100.0;

                for(Cout row : groupRows){
                    row.setMode(mode);
                    row.setValeur(valeur);
                    row.setPlafond(plafond);
                    row.setCout(costPerItem);
                }

            }else if( "annulation".equalsIgnoreCase(type)){
               double base = 0.0;
               if(!superCoutTotal.isEmpty()){
                     base = superCoutTotal.get(superCoutTotal.size()-1);
                   
               } 
               double totalAnnul = -base;
               double costPerItem = totalAnnul/groupRows.size();
                costPerItem = Math.round(costPerItem * 100) / 100.0;

                for(Cout row : groupRows){
                    row.setCout(costPerItem);
                }
            }
        }
        coutRepository.saveAll(allCouts);

    }
}
