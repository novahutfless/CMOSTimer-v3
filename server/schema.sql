CREATE TABLE IF NOT EXISTS `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(64) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `data_store` (
  `user_id` int(11) NOT NULL,
  `type` varchar(32) NOT NULL, -- 'session', 'solve', 'settings', 'stats_config', 'goal', 'plugin'
  `item_id` varchar(64) NOT NULL, -- UUID or 'MAIN' for singletons like settings
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL, -- JSON Data
  `updated_at` bigint(20) NOT NULL,
  PRIMARY KEY (`user_id`,`type`,`item_id`),
  CONSTRAINT `fk_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;