# Fiche de Référence Rapide (Cheatsheet) : Spring Boot & SQLite (JPA)

Cette fiche regroupe les structures de code Java Spring Boot les plus courantes pour interagir avec une base de données SQLite. Elle est optimisée pour être simple à comprendre, mémoriser et reproduire lors d'une évaluation pratique.

---

## 1. Déclaration d'une Entité JPA standard

C'est la classe Java qui représente une table dans SQLite.

> [!IMPORTANT]
> Pour SQLite, utilisez **obligatoirement** la stratégie de génération de clé `GenerationType.IDENTITY` pour que l'auto-incrémentation fonctionne correctement.

```java
package com.eval.sqlite.model;

import jakarta.persistence.*;

@Entity
@Table(name = "items") // Nom de la table dans SQLite
public class Item {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Crucial pour SQLite
    private Long id;

    @Column(name = "item_name", nullable = false, unique = true)
    private String name;

    private String description;

    // Constructeurs
    public Item() {}
    public Item(String name, String description) {
        this.name = name;
        this.description = description;
    }

    // Getters et Setters (Toujours indispensables pour Jackson/JSON)
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
}
```

---

## 2. Déclaration du Repository JPA (Accès Données)

Interface héritant de `JpaRepository` pour gérer automatiquement les opérations CRUD de base.

```java
package com.eval.sqlite.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.eval.sqlite.model.Item;
import java.util.Optional;
import java.util.List;

public interface ItemRepository extends JpaRepository<Item, Long> {
    
    // Requête automatique générée par Spring Data (findBy...)
    Optional<Item> findByName(String name);

    List<Item> findByDescriptionContaining(String keyword);

    // Requête SQLite native personnalisée
    @Query(value = "SELECT * FROM items WHERE item_name = :name LIMIT 1", nativeQuery = true)
    Item findByNameNative(@Param("name") String name);
}
```

---

## 3. Contrôleur REST standard (CRUD + CORS)

Contrôleur pour exposer l'API REST au frontend React.

> [!WARNING]
> N'oubliez jamais l'annotation `@CrossOrigin` pour éviter les blocages CORS sur le frontend.

```java
package com.eval.sqlite.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.eval.sqlite.model.Item;
import com.eval.sqlite.repository.ItemRepository;
import java.util.List;

@CrossOrigin(origins = "http://localhost:5173") // Autorise le frontend React
@RestController
@RequestMapping("/api/items")
public class ItemController {

    @Autowired
    private ItemRepository itemRepository;

    // 1. Lire tout (GET)
    @GetMapping
    public List<Item> getAll() {
        return itemRepository.findAll();
    }

    // 2. Lire un élément par ID (GET)
    @GetMapping("/{id}")
    public Item getById(@PathVariable Long id) {
        return itemRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Élément introuvable avec l'ID: " + id));
    }

    // 3. Créer ou Mettre à jour avec Upsert (POST)
    @PostMapping
    public Item saveOrUpdate(@RequestBody Item item) {
        if (item.getId() != null) {
            // Mise à jour si l'ID est fourni et existe
            return itemRepository.findById(item.getId())
                .map(existing -> {
                    existing.setName(item.getName());
                    existing.setDescription(item.getDescription());
                    return itemRepository.save(existing);
                })
                .orElseGet(() -> itemRepository.save(item));
        } else {
            // Création si pas d'ID
            return itemRepository.save(item);
        }
    }

    // 4. Supprimer (DELETE)
    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) {
        itemRepository.deleteById(id);
    }
}
```

---

## 4. Seeding de données au démarrage (CommandLineRunner)

Pour ajouter automatiquement des données par défaut dans SQLite lorsque la base est vide.

```java
package com.eval.sqlite;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.eval.sqlite.model.Item;
import com.eval.sqlite.repository.ItemRepository;
import java.util.Arrays;

@Configuration
public class DatabaseSeeder {

    @Bean
    public CommandLineRunner initDatabase(ItemRepository repository) {
        return args -> {
            if (repository.count() == 0) {
                System.out.println("Base de données vide. Ensemencement des données...");
                repository.saveAll(Arrays.asList(
                    new Item("Ordinateur", "Ordinateurs fixes et portables"),
                    new Item("Moniteur", "Écrans plats LCD/LED"),
                    new Item("Téléphone", "Téléphones IP et mobiles de service")
                ));
                System.out.println("Données ensemencées avec succès !");
            } else {
                System.out.println("Données déjà présentes. Seeding ignoré.");
            }
        };
    }
}
```

---

## 5. Exécution de requêtes brutes complexes (JdbcTemplate)

Si vous devez exécuter du SQL natif complexe sans passer par les modèles JPA (ex: PRAGMA, migrations, stats d'aggrégation).

```java
package com.eval.sqlite.utils;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import java.util.List;
import java.util.Map;

@Service
public class SqliteRawQueryService {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    // A. Exécuter un SELECT et récupérer des listes de dictionnaires (Clé-Valeur)
    public List<Map<String, Object>> getCustomStats() {
        String sql = "SELECT item_name, count(*) as total FROM items GROUP BY item_name";
        return jdbcTemplate.queryForList(sql);
    }

    // B. Exécuter une commande de modification de schéma (DDL) ou de nettoyage
    public void runMaintenance() {
        // Optimisation de l'espace de la base de données SQLite
        jdbcTemplate.execute("VACUUM");
    }
}
```
