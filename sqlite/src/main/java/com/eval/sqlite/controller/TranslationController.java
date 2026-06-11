package com.eval.sqlite.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.eval.sqlite.model.Translation;
import com.eval.sqlite.repository.TranslationRepository;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/translations")
public class TranslationController {

    @Autowired
    private TranslationRepository translationRepository;

    @GetMapping
    public List<Translation> getAllTranslations() {
        return translationRepository.findAll();
    }

    @GetMapping("/lang/{langCode}")
    public List<Translation> getByLangCode(@PathVariable String langCode) {
        return translationRepository.findByLangCode(langCode);
    }

    @PostMapping
    public Translation createTranslation(@RequestBody Translation translation) {
        return translationRepository.findByLangCodeAndTranslationKey(translation.getLangCode(), translation.getTranslationKey())
            .map(existing -> {
                existing.setValue(translation.getValue());
                return translationRepository.save(existing);
            })
            .orElseGet(() -> translationRepository.save(translation));
    }

    @PostMapping("/bulk")
    public List<Translation> saveAll(@RequestBody List<Translation> translations) {
        return translationRepository.saveAll(translations);
    }

    @DeleteMapping("/{id}")
    public void deleteTranslation(@PathVariable Long id) {
        translationRepository.deleteById(id);
    }
}
