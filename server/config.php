<?php
// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'cmostimer');
define('DB_USER', 'root');
define('DB_PASS', '');

// JWT Secret (Change this to a long random string!)
define('JWT_SECRET', 'change_this_to_a_secure_random_string_xyz123');

// Optional ntfy.sh notifications for new registrations
define('NTFY_ENABLED', false);
define('NTFY_TOPIC_URL', 'https://ntfy.sh/your-topic');
define('NTFY_AUTH_TOKEN', ''); // Optional: set if your topic requires auth
