package com.webventory.tables;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "inventories")
@Data
public class Inventory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String itemCode;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String category;

    private int stock = 0;
    private String itemCondition = "Good";
    private boolean isAvailable = true;
}