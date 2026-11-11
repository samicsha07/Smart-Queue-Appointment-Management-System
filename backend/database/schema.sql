-- SmartQueue Database Schema for MySQL
-- Database: smartqueue_db

CREATE DATABASE IF NOT EXISTS smartqueue_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smartqueue_db;

-- 1. Users Table (Customers)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Admins Table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'admin', -- 'superadmin', 'admin', 'operator'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_admin_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Service Centres Table
CREATE TABLE IF NOT EXISTS service_centres (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'Hospital', 'Clinic', 'Bank', 'Salon', 'Service Centre'
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    phone VARCHAR(25),
    opening_time VARCHAR(10) DEFAULT '09:00',
    closing_time VARCHAR(10) DEFAULT '18:00',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Service Categories Table
CREATE TABLE IF NOT EXISTS service_categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    centre_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    avg_duration_minutes INT DEFAULT 15,
    token_prefix VARCHAR(5) DEFAULT 'A',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_category_centre FOREIGN KEY (centre_id) REFERENCES service_centres(id) ON DELETE CASCADE,
    INDEX idx_cat_centre (centre_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. Service Slots Table
CREATE TABLE IF NOT EXISTS service_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    centre_id INT NOT NULL,
    category_id INT NOT NULL,
    slot_date DATE NOT NULL,
    start_time VARCHAR(10) NOT NULL,
    end_time VARCHAR(10) NOT NULL,
    max_capacity INT DEFAULT 5,
    booked_count INT DEFAULT 0,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_slot_centre FOREIGN KEY (centre_id) REFERENCES service_centres(id) ON DELETE CASCADE,
    CONSTRAINT fk_slot_category FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE,
    UNIQUE KEY uq_slot_centre_cat_date_time (centre_id, category_id, slot_date, start_time),
    INDEX idx_slot_lookup (centre_id, category_id, slot_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. Appointments Table
CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    centre_id INT NOT NULL,
    category_id INT NOT NULL,
    slot_id INT,
    appointment_date DATE NOT NULL,
    appointment_time VARCHAR(10) NOT NULL,
    status VARCHAR(20) DEFAULT 'booked', -- 'booked', 'confirmed', 'completed', 'cancelled'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_app_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_app_centre FOREIGN KEY (centre_id) REFERENCES service_centres(id) ON DELETE CASCADE,
    CONSTRAINT fk_app_category FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE,
    CONSTRAINT fk_app_slot FOREIGN KEY (slot_id) REFERENCES service_slots(id) ON DELETE SET NULL,
    INDEX idx_app_user (user_id),
    INDEX idx_app_centre_date (centre_id, appointment_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Queue Tokens Table
CREATE TABLE IF NOT EXISTS queue_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token_number VARCHAR(20) NOT NULL, -- e.g. A001, A002
    sequence_number INT NOT NULL,      -- numeric sequence 1, 2, 3...
    appointment_id INT UNIQUE,         -- 1-to-1 with appointment (nullable for walk-in)
    user_id INT,                       -- customer
    centre_id INT NOT NULL,
    category_id INT NOT NULL,
    operating_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting', -- 'waiting', 'serving', 'completed', 'skipped', 'cancelled'
    called_at TIMESTAMP NULL DEFAULT NULL,
    served_at TIMESTAMP NULL DEFAULT NULL,
    completed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_token_app FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    CONSTRAINT fk_token_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_token_centre FOREIGN KEY (centre_id) REFERENCES service_centres(id) ON DELETE CASCADE,
    CONSTRAINT fk_token_category FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE CASCADE,
    UNIQUE KEY uq_centre_date_token (centre_id, operating_date, token_number),
    INDEX idx_queue_active (centre_id, operating_date, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    appointment_id INT,
    token_id INT,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- 'booking', 'token', 'approaching', 'serving', 'cancellation'
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_app FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
    CONSTRAINT fk_notif_token FOREIGN KEY (token_id) REFERENCES queue_tokens(id) ON DELETE SET NULL,
    INDEX idx_user_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
