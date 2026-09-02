<?php
// SQLite Configuration
define('SQLITE_DB_PATH', __DIR__ . '/data/cmostimer.sqlite');
define('SQLITE_BUSY_TIMEOUT_MS', 5000);

// Backups run on the first API request of each UTC day. In production, point
// this outside the web root and include it in the host-level backup strategy.
define('SQLITE_BACKUP_ENABLED', true);
define('SQLITE_BACKUP_DIR', __DIR__ . '/data/backups');
define('SQLITE_BACKUP_TIMEZONE', 'UTC');

// CORS Configuration (set your production domains here)
define('CORS_ALLOWED_ORIGINS', [
    'https://speed-cmos.com',
    'https://www.speed-cmos.com',
    'http://tauri.localhost',
    'tauri://localhost',
    'http://localhost',
    'https://localhost',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]);

// Auth rate limiting
define('AUTH_WINDOW_SECONDS', 900); // 15 minutes
define('AUTH_LOGIN_MAX_ATTEMPTS', 25);
define('AUTH_REGISTER_MAX_ATTEMPTS', 10);

// JWT Secret (Change this to a long random string!)
define('JWT_SECRET', 'change_this_to_a_secure_random_string_xyz123');

// Optional ntfy.sh notifications for new registrations
define('NTFY_ENABLED', false);
define('NTFY_TOPIC_URL', 'https://ntfy.sh/your-topic');
define('NTFY_AUTH_TOKEN', ''); // Optional: set if your topic requires auth
