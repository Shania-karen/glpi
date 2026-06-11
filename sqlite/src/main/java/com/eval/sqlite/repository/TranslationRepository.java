package com.eval.sqlite.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.eval.sqlite.model.Translation;
import java.util.List;
import java.util.Optional;

@Repository
public interface TranslationRepository extends JpaRepository<Translation, Long> {
    List<Translation> findByLangCode(String langCode);
    Optional<Translation> findByLangCodeAndTranslationKey(String langCode, String translationKey);
}
