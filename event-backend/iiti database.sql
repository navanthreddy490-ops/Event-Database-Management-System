CREATE DATABASE user_db;
USE user_db;
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userid VARCHAR(50),
    mobile VARCHAR(15),
    password VARCHAR(100)
);
