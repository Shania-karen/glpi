# Scénarios Supplémentaires d'Évaluation — Spring Boot & SQLite (Examen)

Ce guide propose 3 nouveaux scénarios pratiques conçus pour être facilement mémorisés et reproduits en examen. Ils démontrent des cas réels d'extension fonctionnelle via la base SQLite locale couplée à GLPI.

---

## 💡 Sommaire des Scénarios
1. **Scénario A : Système de Favoris (Bookmark Tickets)** — Marquer des tickets comme favoris localement par utilisateur dans SQLite.
2. **Scénario B : Moteur d'Assignation Automatique par Catégorie** — Assigner automatiquement le bon technicien selon la catégorie du ticket.
3. **Scénario C : Historique des Notes Privées Techniques** — Ajouter un journal de notes confidentielles associées aux tickets (hors GLPI).

---

## 🛠️ Scénario A : Système de Favoris (Bookmark Tickets)

L'évaluateur demande : *"Ajoutez un système permettant à chaque utilisateur de marquer des tickets GLPI comme favoris. La liste des favoris doit être stockée localement dans SQLite."*

### Étape 1 : Le Modèle JPA (`FavoriteTicket.java`)
*Fichier :* `sqlite/src/main/java/com/eval/sqlite/model/FavoriteTicket.java`

```java
package com.eval.sqlite.model;

import jakarta.persistence.*;

@Entity
@Table(name = "favorite_tickets", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"username", "ticket_id"})
})
public class FavoriteTicket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String username; // L'utilisateur connecté

    @Column(name = "ticket_id", nullable = false)
    private Long ticketId; // L'ID du ticket GLPI favori

    public FavoriteTicket() {}

    public FavoriteTicket(String username, Long ticketId) {
        this.username = username;
        this.ticketId = ticketId;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public Long getTicketId() { return ticketId; }
    public void setTicketId(Long ticketId) { this.ticketId = ticketId; }
}
```

### Étape 2 : Le Repository (`FavoriteTicketRepository.java`)
*Fichier :* `sqlite/src/main/java/com/eval/sqlite/repository/FavoriteTicketRepository.java`

```java
package com.eval.sqlite.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.eval.sqlite.model.FavoriteTicket;
import java.util.List;
import java.util.Optional;

public interface FavoriteTicketRepository extends JpaRepository<FavoriteTicket, Long> {
    List<FavoriteTicket> findByUsername(String username);
    Optional<FavoriteTicket> findByUsernameAndTicketId(String username, Long ticketId);
    void deleteByUsernameAndTicketId(String username, Long ticketId);
}
```

### Étape 3 : Le Contrôleur (`FavoriteTicketController.java`)
*Fichier :* `sqlite/src/main/java/com/eval/sqlite/controller/FavoriteTicketController.java`

```java
package com.eval.sqlite.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import com.eval.sqlite.model.FavoriteTicket;
import com.eval.sqlite.repository.FavoriteTicketRepository;
import java.util.List;
import java.util.Map;
import java.util.HashMap;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/favorites")
public class FavoriteTicketController {

    @Autowired
    private FavoriteTicketRepository favoriteRepository;

    // 1. Récupérer tous les favoris d'un utilisateur
    @GetMapping("/{username}")
    public List<FavoriteTicket> getFavorites(@PathVariable String username) {
        return favoriteRepository.findByUsername(username);
    }

    // 2. Ajouter un favori
    @PostMapping
    public FavoriteTicket addFavorite(@RequestBody FavoriteTicket fav) {
        return favoriteRepository.findByUsernameAndTicketId(fav.getUsername(), fav.getTicketId())
            .orElseGet(() -> favoriteRepository.save(fav));
    }

    // 3. Supprimer un favori
    @Transactional
    @DeleteMapping("/{username}/{ticketId}")
    public Map<String, Object> removeFavorite(@PathVariable String username, @PathVariable Long ticketId) {
        favoriteRepository.deleteByUsernameAndTicketId(username, ticketId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        return response;
    }
}
```

### Étape 4 : Utilisation côté Frontend (Composant React)
Intégrez un bouton en forme d'étoile dans le ticket (par exemple dans la liste des tickets ou `TicketFiche.jsx`) :

```javascript
import { useState, useEffect } from 'react';

export default function TicketFavoriteButton({ ticketId, username = 'admin' }) {
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    // Charger l'état initial des favoris
    fetch(`http://localhost:8081/api/favorites/${username}`)
      .then(res => res.json())
      .then(data => {
        const found = data.some(fav => fav.ticketId === parseInt(ticketId, 10));
        setIsFavorite(found);
      });
  }, [ticketId, username]);

  const toggleFavorite = async () => {
    if (isFavorite) {
      await fetch(`http://localhost:8081/api/favorites/${username}/${ticketId}`, {
        method: 'DELETE'
      });
      setIsFavorite(false);
    } else {
      await fetch('http://localhost:8081/api/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, ticketId })
      });
      setIsFavorite(true);
    }
  };

  return (
    <button onClick={toggleFavorite} className="text-xl focus:outline-none">
      {isFavorite ? '⭐' : '☆'}
    </button>
  );
}
```

---

## 🛠️ Scénario B : Moteur d'Assignation Automatique par Catégorie

L'évaluateur demande : *"Créez une table d'assignation dans SQLite. Quand le technicien crée ou modifie un ticket avec une certaine catégorie, le système doit chercher automatiquement dans SQLite le technicien responsable de cette catégorie pour lui affecter le ticket."*

### Étape 1 : Le Modèle JPA (`CategoryAssignment.java`)
*Fichier :* `sqlite/src/main/java/com/eval/sqlite/model/CategoryAssignment.java`

```java
package com.eval.sqlite.model;

import jakarta.persistence.*;

@Entity
@Table(name = "category_assignments")
public class CategoryAssignment {

    @Id
    @Column(name = "category_id") // ID de la catégorie GLPI
    private Long categoryId;

    @Column(name = "category_name")
    private String categoryName;

    @Column(name = "technician_id", nullable = false) // ID du technicien GLPI à assigner
    private Long technicianId;

    @Column(name = "technician_name")
    private String technicianName;

    public CategoryAssignment() {}

    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
    public String getCategoryName() { return categoryName; }
    public void setCategoryName(String categoryName) { this.categoryName = categoryName; }
    public Long getTechnicianId() { return technicianId; }
    public void setTechnicianId(Long technicianId) { this.technicianId = technicianId; }
    public String getTechnicianName() { return technicianName; }
    public void setTechnicianName(String technicianName) { this.technicianName = technicianName; }
}
```

### Étape 2 : Le Repository (`CategoryAssignmentRepository.java`)
*Fichier :* `sqlite/src/main/java/com/eval/sqlite/repository/CategoryAssignmentRepository.java`

```java
package com.eval.sqlite.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.eval.sqlite.model.CategoryAssignment;

public interface CategoryAssignmentRepository extends JpaRepository<CategoryAssignment, Long> {
}
```

### Étape 3 : Le Contrôleur (`CategoryAssignmentController.java`)
*Fichier :* `sqlite/src/main/java/com/eval/sqlite/controller/CategoryAssignmentController.java`

```java
package com.eval.sqlite.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.eval.sqlite.model.CategoryAssignment;
import com.eval.sqlite.repository.CategoryAssignmentRepository;
import java.util.Optional;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/assignments")
public class CategoryAssignmentController {

    @Autowired
    private CategoryAssignmentRepository assignmentRepository;

    @GetMapping("/{categoryId}")
    public Optional<CategoryAssignment> getAssignmentForCategory(@PathVariable Long categoryId) {
        return assignmentRepository.findById(categoryId);
    }
}
```

### Étape 4 : Utilisation Frontend lors de la création d'un ticket
Dans le formulaire de création de ticket (`TicketCreate.jsx`), ajoutez un écouteur de changement de catégorie :

```javascript
const handleCategoryChange = async (categoryId) => {
  setFormData(prev => ({ ...prev, itilcategories_id: categoryId }));

  if (!categoryId) return;

  try {
    const res = await fetch(`http://localhost:8081/api/assignments/${categoryId}`);
    if (res.ok) {
      const rule = await res.json();
      if (rule && rule.technicianId) {
        // Assigner automatiquement le technicien dans le formulaire
        setFormData(prev => ({ ...prev, _users_id_assign: rule.technicianId }));
        alert(`Assignation automatique au technicien : ${rule.technicianName}`);
      }
    }
  } catch (error) {
    console.error("Aucune règle d'assignation trouvée dans SQLite pour cette catégorie", error);
  }
};
```

---

## 🛠️ Scénario C : Historique des Notes Privées Techniques (Confidentielles)

L'évaluateur demande : *"Ajoutez une fonctionnalité de 'Notes Techniques Privées' sur chaque ticket. Ces notes doivent être stockées uniquement dans la base SQLite locale pour des raisons de confidentialité et ne doivent jamais être transmises à GLPI."*

### Étape 1 : Le Modèle JPA (`PrivateNote.java`)
*Fichier :* `sqlite/src/main/java/com/eval/sqlite/model/PrivateNote.java`

```java
package com.eval.sqlite.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "private_notes")
public class PrivateNote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ticket_id", nullable = false)
    private Long ticketId;

    @Column(nullable = false, length = 1000)
    private String noteContent;

    @Column(name = "author")
    private String author;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public PrivateNote() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTicketId() { return ticketId; }
    public void setTicketId(Long ticketId) { this.ticketId = ticketId; }
    public String getNoteContent() { return noteContent; }
    public void setNoteContent(String noteContent) { this.noteContent = noteContent; }
    public String getAuthor() { return author; }
    public void setAuthor(String author) { this.author = author; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
```

### Étape 2 : Le Repository (`PrivateNoteRepository.java`)
*Fichier :* `sqlite/src/main/java/com/eval/sqlite/repository/PrivateNoteRepository.java`

```java
package com.eval.sqlite.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.eval.sqlite.model.PrivateNote;
import java.util.List;

public interface PrivateNoteRepository extends JpaRepository<PrivateNote, Long> {
    List<PrivateNote> findByTicketIdOrderByCreatedAtDesc(Long ticketId);
}
```

### Étape 3 : Le Contrôleur REST (`PrivateNoteController.java`)
*Fichier :* `sqlite/src/main/java/com/eval/sqlite/controller/PrivateNoteController.java`

```java
package com.eval.sqlite.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.eval.sqlite.model.PrivateNote;
import com.eval.sqlite.repository.PrivateNoteRepository;
import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/private-notes")
public class PrivateNoteController {

    @Autowired
    private PrivateNoteRepository noteRepository;

    // Récupérer toutes les notes privées d'un ticket
    @GetMapping("/ticket/{ticketId}")
    public List<PrivateNote> getNotesByTicket(@PathVariable Long ticketId) {
        return noteRepository.findByTicketIdOrderByCreatedAtDesc(ticketId);
    }

    // Ajouter une note privée
    @PostMapping
    public PrivateNote addNote(@RequestBody PrivateNote note) {
        if (note.getCreatedAt() == null) {
            note.setCreatedAt(java.time.LocalDateTime.now());
        }
        return noteRepository.save(note);
    }
}
```

### Étape 4 : Intégration React (Timeline Privée)
Dans `TicketDetailView.jsx`, créez un onglet "Notes Privées" et intégrez la saisie et l'affichage local de ces notes confidentielles via des requêtes `fetch` vers `http://localhost:8081/api/private-notes`.
