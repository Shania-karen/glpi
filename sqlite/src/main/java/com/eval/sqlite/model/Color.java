package com.eval.sqlite.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "colors")
public class Color{
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    private String color;
    private String status;

    public Color(){}
    public Color(String color, String status){
        this.color=color;
        this.status=status;
    }
    
    public Long getId() { return id;}
    public void setId(Long id) { this.id = id;}
    public String getColor() { return color;}
    public void setColor(String color) { this.color = color;}
    public String getStatus() { return status;}
    public void setStatus(String status) {this.status = status;}
    
}