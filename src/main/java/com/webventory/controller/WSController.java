package com.webventory.controller;

import com.webventory.model.WSBorrowRequest;
import com.webventory.repository.WSBorrowRequestRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/working_scholar")

public class WSController {
    
    @Autowired
    private WSBorrowRequestRepository requestRepository;

    // 1. Serve the Dashboard HTML Page
    @GetMapping("/dashboard")
    public String viewDashboard(Model model) {
        // Fetch pending requests for the table view
        List<WSBorrowRequest> pendingRequests = requestRepository.findByStatus("PENDING");
        model.addAttribute("pendingRequests", pendingRequests);

        // Add dynamic stats for cards
        model.addAttribute("pendingCount", pendingRequests.size());
        model.addAttribute("borrowedCount", requestRepository.findByStatus("BORROWED").size());
        model.addAttribute("overdueCount", requestRepository.findByStatus("OVERDUE").size());
        model.addAttribute("availableCount", 0);
        
        return "working_scholar/working_scholar_dashboard"; 
    }

    // 2. Serve the Account Settings HTML Page
    @GetMapping("/account_settings")
    public String viewAccountSettings(Model model) {
        // Pass individual details directly to the model
        model.addAttribute("userInitials", "AR");
        model.addAttribute("fullName", "Ana Reyes");
        model.addAttribute("scholarId", "00000001");
        model.addAttribute("mobileNumber", "09175550101");
        model.addAttribute("programYear", "");

        return "working_scholar/working_scholar_account_setting"; 
    }

    // 3. Serve the Pending Requests Page
    @GetMapping("/requests")
    public String viewRequests(Model model) {
        return "working_scholar/working_scholar_requests";
    }

    // 4. Serve the Cancellation Requests Page
    @GetMapping("/cancellations")
    public String viewCancellations(Model model) {
        return "working_scholar/working_scholar_cancellations";
    }

    // 5. Serve the Inventory Page
    @GetMapping("/inventory")
    public String viewInventory(Model model) {
        return "working_scholar/working_scholar_inventory";
    }

    // 6. Serve the Borrowed Items Page
    @GetMapping("/borrowed")
    public String viewBorrowed(Model model) {
        return "working_scholar/working_scholar_borrowed";
    }

    // 7. Serve the Return Processing Page
    @GetMapping("/returns")
    public String viewReturns(Model model) {
        return "working_scholar/working_scholar_returns";
    }

    // 8. Serve the History Page
    @GetMapping("/history")
    public String viewHistory(Model model) {
        return "working_scholar/working_scholar_history";
    }

    // 9. Handle "Approve" Action
    @PostMapping("/request/approve/{id}")
    public String approveRequest(@PathVariable Long id) {
        WSBorrowRequest request = requestRepository.findById(id).orElse(null);
        if (request != null) {
            request.setStatus("APPROVED");
            requestRepository.save(request);
        }
        return "redirect:/working_scholar/dashboard";
    }

    // 10. Handle "Reject" Action
    @PostMapping("/request/reject/{id}")
    public String rejectRequest(@PathVariable Long id) {
        WSBorrowRequest request = requestRepository.findById(id).orElse(null);
        if (request != null) {
            request.setStatus("REJECTED");
            requestRepository.save(request);
        }
        return "redirect:/working_scholar/dashboard";
    }
}