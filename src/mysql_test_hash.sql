-- Create the user table
CREATE TABLE user (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL
);

-- Insert seed data into the user table
INSERT INTO user (email, password) VALUES
    ('john.doe@example.com', 'hashed_password_1'),
    ('jane.smith@example.com', 'hashed_password_2'),
    ('bob.johnson@example.com', 'hashed_password_3'),
    ('alice.williams@example.com', 'hashed_password_4'),
    ('charlie.brown@example.com', 'hashed_password_5');

-- Create the purchase table with a foreign key reference to the user table
CREATE TABLE purchase (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    name VARCHAR(200) NOT NULL,
    order_date DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES user(id)
);

-- Insert seed data into the purchase table
INSERT INTO purchase (user_id, name, order_date) VALUES
    (1, 'Smartphone', '2025-01-15'),
    (1, 'Laptop Case', '2025-02-20'),
    (2, 'Wireless Earbuds', '2025-01-30'),
    (3, 'External Hard Drive', '2025-02-05'),
    (3, 'Mechanical Keyboard', '2025-02-28'),
    (4, 'Monitor', '2025-01-22'),
    (2, 'Gaming Mouse', '2025-03-01'),
    (5, 'Bluetooth Speaker', '2025-02-14'),
    (4, 'USB-C Hub', '2025-02-25'),
    (5, 'Tablet', '2025-03-05');
