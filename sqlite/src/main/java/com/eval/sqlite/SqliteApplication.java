package com.eval.sqlite;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import java.util.Arrays;
import com.eval.sqlite.model.Translation;
import com.eval.sqlite.model.Color;
import com.eval.sqlite.repository.TranslationRepository;
import com.eval.sqlite.repository.ColorRepository;

@SpringBootApplication
public class SqliteApplication {

	public static void main(String[] args) {
		SpringApplication.run(SqliteApplication.class, args);
	}

	@Bean
	public CommandLineRunner initData(TranslationRepository repository, ColorRepository colorRepository) {
		return args -> {
			repository.deleteAll();  
			repository.saveAll(Arrays.asList(
					// French translations
					new Translation("fr", "nouveau", "Nouveau"),
					new Translation("fr", "nouveaux", "Nouveaux"),
					new Translation("fr", "en_attente", "En Attente"),
					new Translation("fr", "assignes", "Assignés"),
					new Translation("fr", "planifies", "Planifiés"),
					new Translation("fr", "resolus", "Résolus"),
					new Translation("fr", "fermes", "Fermés"),	
					new Translation("fr", "in_progress", "En cours"),
					new Translation("fr", "termine", "Terminé"),
	
					// Malagasy translations
					new Translation("mg", "nouveau", "Vaovao"),
					new Translation("mg", "nouveaux", "Vaovao"),
					new Translation("mg", "in_progress", "An-dalana"),
					new Translation("mg", "termine", "Vita"),
					new Translation("mg", "en_attente", "Miandry"),
					new Translation("mg", "assignes", "Nomeny"),
					new Translation("mg", "planifies", "Natao plan"),
					new Translation("mg", "resolus", "Vita"),
					new Translation("mg", "fermes", "Mihidy")						
				));
			System.out.println("Default translations seeded into SQLite.");

			colorRepository.deleteAll();
			colorRepository.saveAll(Arrays.asList(
				new Color("#22c55e", "nouveau"),
				new Color("#f97316", "in_progress"),
				new Color("#ef4444", "termine")
			));
			System.out.println("Default colors seeded into SQLite.");
		};
	}
}
