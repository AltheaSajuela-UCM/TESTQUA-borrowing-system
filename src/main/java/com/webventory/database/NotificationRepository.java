package com.webventory.database;

import com.webventory.tables.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByOrderByCreatedAtDesc();
}