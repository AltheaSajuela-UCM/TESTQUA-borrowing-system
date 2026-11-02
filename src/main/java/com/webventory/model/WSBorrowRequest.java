package com.webventory.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Table(name = "borrow_requests")
@Data
public class WSBorrowRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String studentName;
    private String itemName;
    private String status; // PENDING, APPROVED, REJECTED, BORROWED, OVERDUE
    private LocalDate requestDate;
    private LocalDate dueDate;
}