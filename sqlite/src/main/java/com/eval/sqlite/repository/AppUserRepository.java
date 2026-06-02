package com.eval.sqlite.repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import jdk.jfr.Label;
import  com.eval.sqlite.model.AppUser;

@Repository
public interface AppUserRepository extends JpaRepository<AppUser, Long> {
    
}