package com.eval.sqlite.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.eval.sqlite.model.Color;
import com.eval.sqlite.repository.ColorRepository;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/colors")
public class ColorController {

    @Autowired
    private ColorRepository colorRepository;

    @GetMapping
    public List<Color> getAllColors() {
        return colorRepository.findAll();
    }

    @PostMapping
    public Color saveColor(@RequestBody Color color) {
        return colorRepository.findByStatus(color.getStatus())
            .map(existing -> {
                existing.setColor(color.getColor());
                return colorRepository.save(existing);
            })
            .orElseGet(() -> colorRepository.save(color));
    }
}
