package  com.eval.sqlite.controller;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.eval.sqlite.model.AppUser;
import com.eval.sqlite.repository.AppUserRepository;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/users") 
public class AppUserController {

    @Autowired
    private AppUserRepository userRepository; 
    @GetMapping
    public List<AppUser> getAllUsers() {
        return userRepository.findAll(); 
    }
    @PostMapping
    public AppUser createUser(@RequestBody AppUser newUser) {
        // La méthode save() génère automatiquement le "INSERT INTO" pour SQLite
        return userRepository.save(newUser);
    }
    @DeleteMapping("/{id}")
    public void deleteUser(@PathVariable Long id) {
        // Supprime l'utilisateur de la base SQLite grâce à son ID
        userRepository.deleteById(id);
    }
}