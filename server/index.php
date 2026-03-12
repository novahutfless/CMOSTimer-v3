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
        $decoded = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], $payload)), true);
        if (!$decoded) return false;
        if (isset($decoded['exp']) && time() > intval($decoded['exp'])) return false;
        return $decoded;
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

function replaceCollectionData($pdo, $userId, $type, $items) {
    if (!is_array($items)) $items = [];

    $validItems = [];
    $ids = [];
    foreach ($items as $item) {
        if (is_array($item) && isset($item['id'])) {
            $validItems[] = $item;
            $ids[] = strval($item['id']);
        }
    }

    if (empty($ids)) {
        $stmt = $pdo->prepare("DELETE FROM data_store WHERE user_id = ? AND type = ?");
        $stmt->execute([$userId, $type]);
        return;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $sql = "DELETE FROM data_store WHERE user_id = ? AND type = ? AND item_id NOT IN ($placeholders)";
    $stmt = $pdo->prepare($sql);
    $params = array_merge([$userId, $type], $ids);
    $stmt->execute($params);

    foreach ($validItems as $item) {
        upsertData($pdo, $userId, $type, $item['id'], $item);
    }
}

function addSolveAtomic($pdo, $userId, $payload) {
    $solve = $payload['solve'] ?? null;
    $sessionIds = $payload['sessionIds'] ?? [];

    if (!is_array($solve) || !isset($solve['id'])) return;
    if (!is_array($sessionIds) || empty($sessionIds)) {
        upsertData($pdo, $userId, 'solve', $solve['id'], $solve);
        return;
    }

    $sessionIds = array_values(array_unique(array_map('strval', $sessionIds)));
    $placeholders = implode(',', array_fill(0, count($sessionIds), '?'));

    $pdo->beginTransaction();
    try {
        upsertData($pdo, $userId, 'solve', $solve['id'], $solve);

        $sql = "SELECT item_id, payload FROM data_store
                WHERE user_id = ? AND type = 'session' AND item_id IN ($placeholders)
                FOR UPDATE";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(array_merge([$userId], $sessionIds));
        $rows = $stmt->fetchAll();

        $sessionsById = [];
        foreach ($rows as $row) {
            $decoded = json_decode($row['payload'], true);
            if (is_array($decoded)) {
                $sessionsById[strval($row['item_id'])] = $decoded;
            }
        }

        foreach ($sessionIds as $sid) {
            if (!isset($sessionsById[$sid])) continue;
            $session = $sessionsById[$sid];

            if (!isset($session['solveIds']) || !is_array($session['solveIds'])) {
                $session['solveIds'] = [];
            }

            if (!in_array($solve['id'], $session['solveIds'], true)) {
                $session['solveIds'][] = $solve['id'];
            }

            upsertData($pdo, $userId, 'session', $sid, $session);
        }

        $pdo->commit();
    } catch (Exception $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

function mergeSettingsByKey($pdo, $userId, $incoming) {
    if (!is_array($incoming)) {
        upsertData($pdo, $userId, 'settings', 'MAIN', $incoming);
        return;
    }

    $stmt = $pdo->prepare("SELECT payload FROM data_store WHERE user_id = ? AND type = 'settings' AND item_id = 'MAIN' LIMIT 1");
    $stmt->execute([$userId]);
    $row = $stmt->fetch();

    $current = [];
    if ($row && isset($row['payload'])) {
        $decoded = json_decode($row['payload'], true);
        if (is_array($decoded)) $current = $decoded;
    }

    foreach ($incoming as $key => $value) {
        $current[$key] = $value;
    }

    upsertData($pdo, $userId, 'settings', 'MAIN', $current);
}

function sendNewUserNotification($username, $email, $userId) {
    if (!defined('NTFY_ENABLED') || !NTFY_ENABLED) return;
    if (!defined('NTFY_TOPIC_URL') || empty(NTFY_TOPIC_URL)) return;

    $title = "New CMOSTimer user";
    $body = "User created: {$username} ({$email}), id={$userId}, at=" . gmdate('c');
    $headers = [
        'Title: ' . $title,
        'Tags: new,user'
    ];

    if (defined('NTFY_AUTH_TOKEN') && NTFY_AUTH_TOKEN !== '') {
        $headers[] = 'Authorization: Bearer ' . NTFY_AUTH_TOKEN;
    }

    try {
        if (function_exists('curl_init')) {
            $ch = curl_init(NTFY_TOPIC_URL);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
            curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);
            curl_exec($ch);
            curl_close($ch);
        } else {
            $ctx = stream_context_create([
                'http' => [
                    'method' => 'POST',
                    'header' => implode("\r\n", $headers),
                    'content' => $body,
                    'timeout' => 5
                ]
            ]);
            @file_get_contents(NTFY_TOPIC_URL, false, $ctx);
        }
    } catch (Exception $e) {
        error_log('ntfy notification failed: ' . $e->getMessage());
    }
}

function processSyncAction($pdo, $userId, $action) {
    $type = $action['type'] ?? '';
    $payload = $action['payload'] ?? null;

    switch ($type) {
        case 'ADD_SOLVE_ATOMIC':
            addSolveAtomic($pdo, $userId, $payload);
            break;
        case 'UPSERT_SOLVES':
            foreach ($payload as $solve) {
                upsertData($pdo, $userId, 'solve', $solve['id'], $solve);
            }
            break;
        case 'DELETE_SOLVES':
            // Intentionally ignored: solve payloads are retained even when references are removed.
            break;
        case 'UPDATE_SESSION':
            upsertData($pdo, $userId, 'session', $payload['id'], $payload);
            break;
        case 'DELETE_SESSION':
            deleteData($pdo, $userId, 'session', [$payload]);
            break;
        case 'UPDATE_SETTINGS':
            mergeSettingsByKey($pdo, $userId, $payload);
            break;
        case 'UPDATE_STATS_CONFIG':
            upsertData($pdo, $userId, 'stats_config', 'MAIN', $payload);
            break;
        case 'UPDATE_GOALS':
            replaceCollectionData($pdo, $userId, 'goal', $payload);
            break;
        case 'UPDATE_PLUGINS':
            replaceCollectionData($pdo, $userId, 'plugin', $payload);
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
            case 'stats_config': $data['statsConfig'] = $payload; break;
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
            // Process Stats Config
            if (!empty($init['statsConfig'])) {
                upsertData($pdo, $userId, 'stats_config', 'MAIN', $init['statsConfig']);
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

        sendNewUserNotification($username, $email, $userId);

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
