package main.java.com.webventory.controller;

import com.webventory.logic.AdminFunctionalities;
import com.webventory.tables.Transaction;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@CrossOrigin(origins = "*")
public class AdminController {

    @Autowired 
    private AdminFunctionalities functionalities;

    @GetMapping("/dashboard")
    public ResponseEntity<Map<String, Object>> getDashboardData() {
        return ResponseEntity.ok(functionalities.getDashboardMetrics());
    }

    @PostMapping("/borrow")
    public ResponseEntity<?> createBorrowRequest(@RequestBody Map<String, Object> payload) {
        try {
            String userId = (String) payload.get("userIdNumber");
            Long itemId = Long.valueOf(payload.get("itemId").toString());
            LocalDateTime returnDate = LocalDateTime.parse((String) payload.get("expectedReturnDate"));
            
            Transaction tx = functionalities.processBorrow(userId, itemId, returnDate);
            return ResponseEntity.status(211).body(tx);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
