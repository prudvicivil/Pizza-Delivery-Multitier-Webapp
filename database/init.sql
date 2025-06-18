-- Create database
CREATE DATABASE IF NOT EXISTS pizza_delivery;
USE pizza_delivery;

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    customer_address TEXT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'preparing', 'delivered') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    item_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    INDEX idx_order_id (order_id)
);

-- Insert sample data for testing
INSERT INTO orders (customer_name, customer_phone, customer_address, total, status) VALUES
('John Doe', '+1-555-0101', '123 Main St, Anytown, USA', 27.98, 'delivered'),
('Jane Smith', '+1-555-0102', '456 Oak Ave, Springfield, USA', 14.99, 'preparing'),
('Bob Johnson', '+1-555-0103', '789 Pine Rd, Hometown, USA', 32.97, 'pending');

INSERT INTO order_items (order_id, item_name, item_price, quantity) VALUES
(1, 'Pepperoni', 14.99, 1),
(1, 'Margherita', 12.99, 1),
(2, 'Pepperoni', 14.99, 1),
(3, 'Supreme', 17.99, 1),
(3, 'Hawaiian', 15.99, 1);

-- Create user for application (optional, for production use)
-- CREATE USER IF NOT EXISTS 'pizza_user'@'%' IDENTIFIED BY 'pizza_password';
-- GRANT SELECT, INSERT, UPDATE, DELETE ON pizza_delivery.* TO 'pizza_user'@'%';
-- FLUSH PRIVILEGES;
