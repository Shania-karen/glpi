package com.eval.sqlite.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.eval.sqlite.model.Color;

@Repository
public interface ColorRepository extends JpaRepository<Color, Long> {
    Optional<Color> findByStatus(String status);
}