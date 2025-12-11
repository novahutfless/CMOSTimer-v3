# CMOSTimer v3 Server Setup

This document contains the complete PHP server code required to run the CMOSTimer v3 Cloud Sync API.

## 1. Database Schema

Create a MySQL/MariaDB database and run the following SQL to create the necessary tables.

**File:** `sql/schema.sql`

```sql
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
```

## 2. Configuration

Create a configuration file with your database credentials.

**File:** `api/config.php`

```php
<?php
// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'cmostimer');
define('DB_USER', 'root');
define('DB_PASS', '');

// JWT Secret (Change this to a long random string!)
define('JWT_SECRET', 'change_this_to_a_secure_random_string_xyz123');
```

## 3. Main API Logic

This single file handles routing, authentication, and data synchronization.

**File:** `api/index.php`

```php
<?php
/**
 * CMOSTimer v3 API
 */

// --- CORS & Headers ---
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'config.php';

// --- Database Connection ---
function getDB() {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    return new PDO($dsn, DB_USER, DB_PASS, $options);
}

// --- JWT Helper (Simple Implementation) ---
function generateJWT($userId, $username) {
    $header = json_encode(['typ' => 'JWT', 'alg' => 'HS256']);
    $payload = json_encode([
        'sub' => $userId,
        'name' => $username,
        'iat' => time(),
        'exp' => time() + (60 * 60 * 24 * 365) // 1 Year Expiry
    ]);
    
    $base64UrlHeader = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($header));
    $base64UrlPayload = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($payload));
    
    $signature = hash_hmac('sha256', $base64UrlHeader . "." . $base64UrlPayload, JWT_SECRET, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    return $base64UrlHeader . "." . $base64UrlPayload . "." . $base64UrlSignature;
}

function verifyJWT($token) {
    $parts = explode('.', $token);
    if (count($parts) !== 3) return false;
    
    $header = $parts[0];
    $payload = $parts[1];
    $signature_provided = $parts[2];
    
    $signature = hash_hmac('sha256', $header . "." . $payload, JWT_SECRET, true);
    $base64UrlSignature = str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($signature));
    
    if ($base64UrlSignature === $signature_provided) {
        return json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
    }
    return false;
}

function authenticate() {
    $headers = apache_request_headers();
    $authHeader = $headers['Authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    
    if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
        $token = $matches[1];
        $payload = verifyJWT($token);
        if ($payload) return $payload;
    }
    
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

// --- Sync Logic ---
function upsertData($pdo, $userId, $type, $itemId, $payload) {
    $sql = "INSERT INTO data_store (user_id, type, item_id, payload, updated_at) 
            VALUES (:uid, :type, :iid, :payload, :ts) 
            ON DUPLICATE KEY UPDATE payload = :payload, updated_at = :ts";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':uid' => $userId,
        ':type' => $type,
        ':iid' => $itemId,
        ':payload' => json_encode($payload),
        ':ts' => time() * 1000
    ]);
}

function deleteData($pdo, $userId, $type, $itemIds) {
    if (empty($itemIds)) return;
    $placeholders = implode(',', array_fill(0, count($itemIds), '?'));
    $sql = "DELETE FROM data_store WHERE user_id = ? AND type = ? AND item_id IN ($placeholders)";
    $stmt = $pdo->prepare($sql);
    $params = array_merge([$userId, $type], $itemIds);
    $stmt->execute($params);
}

function processSyncAction($pdo, $userId, $action) {
    $type = $action['type'] ?? '';
    $payload = $action['payload'] ?? null;

    switch ($type) {
        case 'UPSERT_SOLVES':
            foreach ($payload as $solve) {
                upsertData($pdo, $userId, 'solve', $solve['id'], $solve);
            }
            break;
        case 'DELETE_SOLVES':
            deleteData($pdo, $userId, 'solve', $payload);
            break;
        case 'UPDATE_SESSION':
            upsertData($pdo, $userId, 'session', $payload['id'], $payload);
            break;
        case 'DELETE_SESSION':
            deleteData($pdo, $userId, 'session', [$payload]);
            break;
        case 'UPDATE_SETTINGS':
            upsertData($pdo, $userId, 'settings', 'MAIN', $payload);
            break;
        case 'UPDATE_GOALS':
            // Full replace or incremental? Frontend sends full array usually for goals in this app structure
            // But sync action payload is list of goals.
            // Let's assume upsert for each goal provided.
            foreach ($payload as $goal) {
                upsertData($pdo, $userId, 'goal', $goal['id'], $goal);
            }
            // Note: Deletion of goals is not explicitly handled by UPDATE_GOALS payload in this simple logic 
            // unless explicit delete action exists. The app has DELETE_GOAL action implicitly via state but 
            // `useAppStore` sends UPDATE_GOALS with full list? 
            // Actually `useAppStore` sends full list for settings/goals/plugins updates.
            // So we should strictly probably replace? But merging is safer for multi-device. 
            // We'll stick to Upsert for now.
            break;
        case 'UPDATE_PLUGINS':
            foreach ($payload as $plugin) {
                upsertData($pdo, $userId, 'plugin', $plugin['id'], $plugin);
            }
            break;
    }
}

function getFullUserData($pdo, $userId) {
    $stmt = $pdo->prepare("SELECT type, item_id, payload FROM data_store WHERE user_id = ?");
    $stmt->execute([$userId]);
    $rows = $stmt->fetchAll();

    $data = [
        'sessions' => [],
        'solves' => new stdClass(), // Empty object
        'settings' => null,
        'statsConfig' => [], // Defaults handled by front if missing
        'goals' => [],
        'plugins' => [],
        'currentSessionId' => 'default',
        'updatedAt' => time() * 1000
    ];

    foreach ($rows as $row) {
        $payload = json_decode($row['payload'], true);
        switch ($row['type']) {
            case 'session': $data['sessions'][] = $payload; break;
            case 'solve': $data['solves']->{$row['item_id']} = $payload; break;
            case 'settings': $data['settings'] = $payload; break;
            case 'goal': $data['goals'][] = $payload; break;
            case 'plugin': $data['plugins'][] = $payload; break;
        }
    }
    
    // Fallback currentSessionId logic if needed
    if (!empty($data['sessions'])) {
        $data['currentSessionId'] = $data['sessions'][0]['id'];
    }

    return $data;
}

// --- Main Router ---

$input = json_decode(file_get_contents('php://input'), true);
$route = $input['route'] ?? '';

try {
    $pdo = getDB();

    if ($route === 'register') {
        $username = trim($input['username']);
        $password = $input['password'];
        $email = trim($input['email']);
        
        if (strlen($username) < 3) throw new Exception("Username too short");
        if (strlen($password) < 6) throw new Exception("Password too short");

        // Check exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
        $stmt->execute([$username, $email]);
        if ($stmt->fetch()) throw new Exception("User or Email already exists");

        $hash = password_hash($password, PASSWORD_DEFAULT);
        
        $stmt = $pdo->prepare("INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)");
        $stmt->execute([$username, $email, $hash]);
        $userId = $pdo->lastInsertId();

        $token = generateJWT($userId, $username);
        $userObj = ['id' => $userId, 'username' => $username];

        // Import Initial Data if provided
        if (isset($input['initialData'])) {
            $init = $input['initialData'];
            // Process Sessions
            if (!empty($init['sessions'])) {
                foreach ($init['sessions'] as $s) upsertData($pdo, $userId, 'session', $s['id'], $s);
            }
            // Process Solves
            if (!empty($init['solves'])) {
                foreach ($init['solves'] as $id => $s) upsertData($pdo, $userId, 'solve', $id, $s);
            }
            // Process Settings
            if (!empty($init['settings'])) {
                upsertData($pdo, $userId, 'settings', 'MAIN', $init['settings']);
            }
            // Process Goals
            if (!empty($init['goals'])) {
                foreach ($init['goals'] as $g) upsertData($pdo, $userId, 'goal', $g['id'], $g);
            }
            // Process Plugins
            if (!empty($init['plugins'])) {
                foreach ($init['plugins'] as $p) upsertData($pdo, $userId, 'plugin', $p['id'], $p);
            }
        }

        echo json_encode(['token' => $token, 'user' => $userObj]);

    } elseif ($route === 'login') {
        $username = trim($input['username']);
        $password = $input['password'];

        $stmt = $pdo->prepare("SELECT id, username, password_hash FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            throw new Exception("Invalid credentials");
        }

        $token = generateJWT($user['id'], $user['username']);
        $userObj = ['id' => $user['id'], 'username' => $user['username']];
        
        // Fetch Data
        $data = getFullUserData($pdo, $user['id']);

        echo json_encode(['token' => $token, 'user' => $userObj, 'data' => $data]);

    } elseif ($route === 'sync') {
        $jwt = authenticate();
        $userId = $jwt['sub'];
        
        $actions = $input['actions'] ?? [];
        foreach ($actions as $action) {
            processSyncAction($pdo, $userId, $action);
        }
        
        echo json_encode(['success' => true, 'syncedAt' => time() * 1000]);

    } elseif ($route === 'get_data') {
        $jwt = authenticate();
        $userId = $jwt['sub'];
        $data = getFullUserData($pdo, $userId);
        echo json_encode($data);

    } else {
        throw new Exception("Invalid route");
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
}
```
