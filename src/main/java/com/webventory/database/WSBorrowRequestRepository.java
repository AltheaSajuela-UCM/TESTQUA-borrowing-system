package com.webventory.repository;

import com.webventory.model.WSBorrowRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WSBorrowRequestRepository
        extends JpaRepository<WSBorrowRequest, Long> {

    List<WSBorrowRequest> findByStatus(String status);
}