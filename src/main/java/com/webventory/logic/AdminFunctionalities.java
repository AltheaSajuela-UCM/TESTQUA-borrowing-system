package com.webventory.logic;

import com.webventory.database.InventoryRepository;
import com.webventory.database.TransactionRepository;
import com.webventory.tables.Inventory;
import com.webventory.tables.Transaction;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class AdminFunctionalities {

    @Autowired private InventoryRepository inventoryRepo;
    @Autowired private TransactionRepository transactionRepo;

    public Map<String, Object> getDashboardMetrics() {
        Map<String, Object> metrics = new HashMap<>();
        List<Inventory> items = inventoryRepo.findAll();

        long totalItems = items.stream().mapToLong(Inventory::getStock).sum();
        long academicCount = items.stream()
                .filter(i -> "Academic".equals(i.getCategory()))
                .mapToLong(Inventory::getStock)
                .sum();

        metrics.put("totalItems", totalItems);
        metrics.put("activeTransactions", transactionRepo.countByStatus("active"));
        metrics.put("academicPct", totalItems > 0 ? Math.round((double) academicCount / totalItems * 100) : 0);
        metrics.put("nonAcademicPct", totalItems > 0 ? Math.round((double) (totalItems - academicCount) / totalItems * 100) : 0);
        return metrics;
    }

    @Transactional
    public Transaction processBorrow(String userIdNumber, Long itemId, LocalDateTime returnDate) {
        Inventory item = inventoryRepo.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Item missing from stock lists."));

        if (!item.isAvailable() || item.getStock() < 1) {
            throw new IllegalStateException("Item is depleted or unavailable.");
        }

        item.setStock(item.getStock() - 1);
        if (item.getStock() == 0) {
            item.setAvailable(false);
        }
        inventoryRepo.save(item);

        Transaction tx = new Transaction();
        tx.setUserIdNumber(userIdNumber);
        tx.setItem(item);
        tx.setExpectedReturnDate(returnDate);
        return transactionRepo.save(tx);
    }
}