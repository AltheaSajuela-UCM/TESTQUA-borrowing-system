package com.webventory.database;

import com.webventory.tables.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    long countByStatus(String status);
    List<Transaction> findByStatusAndExpectedReturnDateBefore(String status, LocalDateTime date);
}