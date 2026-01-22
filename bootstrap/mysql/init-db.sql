-- This script creates the test database
CREATE DATABASE IF NOT EXISTS `myapp_test`;
GRANT ALL PRIVILEGES ON `myapp_test`.* TO 'your_user'@'%';