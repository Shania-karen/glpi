package com.eval.sqlite.controller;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
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
        return coutRepository.save(cout);
    }

    @DeleteMapping("/couts/{id}")
    public ResponseEntity<Void> deleteById(@PathVariable Long id) {
        if (coutRepository.existsById(id)) {
            coutRepository.deleteById(id);
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
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
}
