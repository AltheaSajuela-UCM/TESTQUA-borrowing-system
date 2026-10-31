package com.webventory.tables;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "transactions")
@Data
public class Transaction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String userIdNumber;

    @ManyToOne
    @JoinColumn(name = "inventory_id", nullable = false)
    private Inventory item;

    @Column(nullable = false)
    private String status = "active";

    private LocalDateTime borrowedAt = LocalDateTime.now();
    private LocalDateTime expectedReturnDate;
    private LocalDateTime returnedAt;
}