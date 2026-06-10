package com.eval.sqlite.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "translations")
public class Translation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String langCode; // e.g., "fr", "mg"
    private String translationKey; // e.g., "nouveau"
    private String value; // e.g., "Vaovao"

    public Translation() {}

    public Translation(String langCode, String translationKey, String value) {
        this.langCode = langCode;
        this.translationKey = translationKey;
        this.value = value;
    }

    public Long getId() { return id; }
    public String getLangCode() { return langCode; }
    public void setLangCode(String langCode) { this.langCode = langCode; }
    public String getTranslationKey() { return translationKey; }
    public void setTranslationKey(String translationKey) { this.translationKey = translationKey; }
    public String getValue() { return value; }
    public void setValue(String value) { this.value = value; }
}
