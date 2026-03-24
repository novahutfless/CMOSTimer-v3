<?php
/**
 * CMOSTimer v3 API (SQLite3)
 */

require_once 'config.php';

// --- CORS & Headers ---
function applyCors(): void {
    header('Content-Type: application/json; charset=UTF-8');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: POST, OPTIONS');

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowedOrigins = defined('CORS_ALLOWED_ORIGINS') && is_array(CORS_ALLOWED_ORIGINS) ? CORS_ALLOWED_ORIGINS : [];
    $isOriginAllowed = ($origin === '') || in_array($origin, $allowedOrigins, true);

    if ($origin !== '' && $isOriginAllowed) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
    }

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        if (!$isOriginAllowed) {
            http_response_code(403);
            echo json_encode(['error' => 'Origin not allowed']);
            exit;
        }
        http_response_code(200);
        exit;
    }

    if ($origin !== '' && !$isOriginAllowed) {
        http_response_code(403);
        echo json_encode(['error' => 'Origin not allowed']);
        exit;
    }
}

applyCors();

class ApiException extends Exception {
    private int $status;

    public function __construct(string $message, int $status = 400) {
        parent::__construct($message);
        $this->status = $status;
    }

    public function getStatus(): int {
        return $this->status;
    }
}

function initializeSchema(SQLite3 $db): void {
    $db->exec('PRAGMA foreign_keys = ON');

    $db->exec(
        "CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )"
    );

    $db->exec(
        "CREATE TABLE IF NOT EXISTS data_store (
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            item_id TEXT NOT NULL,
            payload TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            PRIMARY KEY (user_id, type, item_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )"
    );

    $db->exec(
        "CREATE TABLE IF NOT EXISTS auth_attempts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT NOT NULL,
            action TEXT NOT NULL,
            outcome TEXT NOT NULL,
            username TEXT,
            email TEXT,
            reason TEXT,
            created_at INTEGER NOT NULL
        )"
    );
    $db->exec("CREATE INDEX IF NOT EXISTS idx_auth_attempts_action_ip_time ON auth_attempts(action, ip, created_at)");
}

// --- Database Connection ---
function getDB(): SQLite3 {
    static $db = null;
    if ($db instanceof SQLite3) return $db;

    if (!extension_loaded('sqlite3')) {
        throw new Exception('SQLite3 extension is not loaded.');
    }

    $dbPath = defined('SQLITE_DB_PATH') ? SQLITE_DB_PATH : (__DIR__ . '/data/cmostimer.sqlite');
    $dbDir = dirname($dbPath);
    if (!is_dir($dbDir) && !mkdir($dbDir, 0755, true) && !is_dir($dbDir)) {
        throw new Exception('Failed to create database directory.');
    }

    $db = new SQLite3($dbPath, SQLITE3_OPEN_READWRITE | SQLITE3_OPEN_CREATE);
    $db->enableExceptions(true);
    $db->busyTimeout(defined('SQLITE_BUSY_TIMEOUT_MS') ? SQLITE_BUSY_TIMEOUT_MS : 5000);

    initializeSchema($db);

    return $db;
}

function bindValueAuto(SQLite3Stmt $stmt, $key, $value): void {
    if ($value === null) {
        $stmt->bindValue($key, null, SQLITE3_NULL);
    } elseif (is_int($value)) {
        $stmt->bindValue($key, $value, SQLITE3_INTEGER);
    } elseif (is_float($value)) {
        $stmt->bindValue($key, $value, SQLITE3_FLOAT);
    } else {
        $stmt->bindValue($key, (string) $value, SQLITE3_TEXT);
    }
}

function execStatement(SQLite3Stmt $stmt): void {
    $result = $stmt->execute();
    if ($result instanceof SQLite3Result) {
        $result->finalize();
    }
}

function getAllHeadersCompat(): array {
    if (function_exists('getallheaders')) {
        $headers = getallheaders();
        return is_array($headers) ? $headers : [];
    }

    $headers = [];
    foreach ($_SERVER as $key => $value) {
        if (strpos($key, 'HTTP_') === 0) {
            $name = str_replace('_', '-', substr($key, 5));
            $headers[$name] = $value;
        }
    }
    return $headers;
}

function getClientIp(): string {
    $direct = $_SERVER['REMOTE_ADDR'] ?? '';

    $xff = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if (is_string($xff) && $xff !== '') {
        $parts = explode(',', $xff);
        $candidate = trim($parts[0]);
        if (filter_var($candidate, FILTER_VALIDATE_IP)) return $candidate;
    }

    $realIp = $_SERVER['HTTP_X_REAL_IP'] ?? '';
    if (is_string($realIp) && filter_var($realIp, FILTER_VALIDATE_IP)) return $realIp;

    return $direct !== '' ? $direct : 'unknown';
}

function recordAuthAttempt(SQLite3 $db, string $action, string $ip, string $outcome, ?string $username, ?string $email, ?string $reason): void {
    $stmt = $db->prepare(
        'INSERT INTO auth_attempts (ip, action, outcome, username, email, reason, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    bindValueAuto($stmt, 1, $ip);
    bindValueAuto($stmt, 2, $action);
    bindValueAuto($stmt, 3, $outcome);
    bindValueAuto($stmt, 4, $username);
    bindValueAuto($stmt, 5, $email);
    bindValueAuto($stmt, 6, $reason);
    bindValueAuto($stmt, 7, time());
    execStatement($stmt);
}

function getAuthRateLimitMax(string $action): int {
    if ($action === 'register') return (int) (defined('AUTH_REGISTER_MAX_ATTEMPTS') ? AUTH_REGISTER_MAX_ATTEMPTS : 10);
    return (int) (defined('AUTH_LOGIN_MAX_ATTEMPTS') ? AUTH_LOGIN_MAX_ATTEMPTS : 25);
}

function enforceAuthRateLimit(SQLite3 $db, string $action, string $ip, ?string $username, ?string $email): void {
    $windowSeconds = (int) (defined('AUTH_WINDOW_SECONDS') ? AUTH_WINDOW_SECONDS : 900);
    $limit = getAuthRateLimitMax($action);
    $cutoff = time() - $windowSeconds;

    $stmt = $db->prepare('SELECT COUNT(*) AS total FROM auth_attempts WHERE action = ? AND ip = ? AND created_at >= ?');
    bindValueAuto($stmt, 1, $action);
    bindValueAuto($stmt, 2, $ip);
    bindValueAuto($stmt, 3, $cutoff);
    $result = $stmt->execute();
    $row = $result ? ($result->fetchArray(SQLITE3_ASSOC) ?: null) : null;
    if ($result instanceof SQLite3Result) $result->finalize();
    $count = (int) ($row['total'] ?? 0);

    if ($count >= $limit) {
        recordAuthAttempt($db, $action, $ip, 'rate_limited', $username, $email, 'too_many_attempts');
        throw new ApiException('Too many attempts. Please try again later.', 429);
    }

    // Best-effort pruning to keep table bounded.
    if (random_int(1, 100) === 1) {
        $pruneCutoff = time() - (60 * 60 * 24 * 30);
        $pruneStmt = $db->prepare('DELETE FROM auth_attempts WHERE created_at < ?');
        bindValueAuto($pruneStmt, 1, $pruneCutoff);
        execStatement($pruneStmt);
    }
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
    $headers = getAllHeadersCompat();
    $authHeader = $headers['Authorization'] ?? $headers['AUTHORIZATION'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? '';

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
function upsertData(SQLite3 $db, $userId, $type, $itemId, $payload): void {
    $sql = 'INSERT INTO data_store (user_id, type, item_id, payload, updated_at)
            VALUES (:uid, :type, :iid, :payload, :ts)
            ON CONFLICT(user_id, type, item_id)
            DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at';
    $stmt = $db->prepare($sql);
    bindValueAuto($stmt, ':uid', (int) $userId);
    bindValueAuto($stmt, ':type', $type);
    bindValueAuto($stmt, ':iid', (string) $itemId);
    bindValueAuto($stmt, ':payload', json_encode($payload));
    bindValueAuto($stmt, ':ts', time() * 1000);
    execStatement($stmt);
}

function deleteData(SQLite3 $db, $userId, $type, $itemIds): void {
    if (!is_array($itemIds) || empty($itemIds)) return;

    $placeholders = implode(',', array_fill(0, count($itemIds), '?'));
    $sql = "DELETE FROM data_store WHERE user_id = ? AND type = ? AND item_id IN ($placeholders)";
    $stmt = $db->prepare($sql);
    bindValueAuto($stmt, 1, (int) $userId);
    bindValueAuto($stmt, 2, $type);
    foreach (array_values($itemIds) as $i => $id) {
        bindValueAuto($stmt, $i + 3, (string) $id);
    }
    execStatement($stmt);
}

function replaceCollectionData(SQLite3 $db, $userId, $type, $items): void {
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
        $stmt = $db->prepare('DELETE FROM data_store WHERE user_id = ? AND type = ?');
        bindValueAuto($stmt, 1, (int) $userId);
        bindValueAuto($stmt, 2, $type);
        execStatement($stmt);
        return;
    }

    $placeholders = implode(',', array_fill(0, count($ids), '?'));
    $sql = "DELETE FROM data_store WHERE user_id = ? AND type = ? AND item_id NOT IN ($placeholders)";
    $stmt = $db->prepare($sql);
    bindValueAuto($stmt, 1, (int) $userId);
    bindValueAuto($stmt, 2, $type);
    foreach (array_values($ids) as $i => $id) {
        bindValueAuto($stmt, $i + 3, $id);
    }
    execStatement($stmt);

    foreach ($validItems as $item) {
        upsertData($db, $userId, $type, $item['id'], $item);
    }
}

function addSolveAtomic(SQLite3 $db, $userId, $payload): void {
    $solve = $payload['solve'] ?? null;
    $sessionIds = $payload['sessionIds'] ?? [];

    if (!is_array($solve) || !isset($solve['id'])) return;
    if (!is_array($sessionIds) || empty($sessionIds)) {
        upsertData($db, $userId, 'solve', $solve['id'], $solve);
        return;
    }

    $sessionIds = array_values(array_unique(array_map('strval', $sessionIds)));
    $placeholders = implode(',', array_fill(0, count($sessionIds), '?'));

    $db->exec('BEGIN IMMEDIATE TRANSACTION');
    try {
        upsertData($db, $userId, 'solve', $solve['id'], $solve);

        $sql = "SELECT item_id, payload FROM data_store
                WHERE user_id = ? AND type = 'session' AND item_id IN ($placeholders)";
        $stmt = $db->prepare($sql);
        bindValueAuto($stmt, 1, (int) $userId);
        foreach (array_values($sessionIds) as $i => $sid) {
            bindValueAuto($stmt, $i + 2, $sid);
        }

        $result = $stmt->execute();
        $sessionsById = [];
        while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
            $decoded = json_decode($row['payload'], true);
            if (is_array($decoded)) {
                $sessionsById[strval($row['item_id'])] = $decoded;
            }
        }
        $result->finalize();

        foreach ($sessionIds as $sid) {
            if (!isset($sessionsById[$sid])) continue;
            $session = $sessionsById[$sid];

            if (!isset($session['solveIds']) || !is_array($session['solveIds'])) {
                $session['solveIds'] = [];
            }

            if (!in_array($solve['id'], $session['solveIds'], true)) {
                $session['solveIds'][] = $solve['id'];
            }

            upsertData($db, $userId, 'session', $sid, $session);
        }

        $db->exec('COMMIT');
    } catch (Throwable $e) {
        $db->exec('ROLLBACK');
        throw $e;
    }
}

function mergeSettingsByKey(SQLite3 $db, $userId, $incoming): void {
    if (!is_array($incoming)) {
        upsertData($db, $userId, 'settings', 'MAIN', $incoming);
        return;
    }

    $stmt = $db->prepare("SELECT payload FROM data_store WHERE user_id = ? AND type = 'settings' AND item_id = 'MAIN' LIMIT 1");
    bindValueAuto($stmt, 1, (int) $userId);
    $result = $stmt->execute();
    $row = $result->fetchArray(SQLITE3_ASSOC) ?: null;
    $result->finalize();

    $current = [];
    if ($row && isset($row['payload'])) {
        $decoded = json_decode($row['payload'], true);
        if (is_array($decoded)) $current = $decoded;
    }

    foreach ($incoming as $key => $value) {
        $current[$key] = $value;
    }

    upsertData($db, $userId, 'settings', 'MAIN', $current);
}

function sendNewUserNotification($username, $email, $userId) {
    if (!defined('NTFY_ENABLED') || !NTFY_ENABLED) return;
    if (!defined('NTFY_TOPIC_URL') || empty(NTFY_TOPIC_URL)) return;

    $title = 'New CMOSTimer user';
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
    } catch (Throwable $e) {
        error_log('ntfy notification failed: ' . $e->getMessage());
    }
}

function processSyncAction(SQLite3 $db, $userId, $action): void {
    $type = $action['type'] ?? '';
    $payload = $action['payload'] ?? null;

    switch ($type) {
        case 'ADD_SOLVE_ATOMIC':
            addSolveAtomic($db, $userId, $payload);
            break;
        case 'UPSERT_SOLVES':
            if (is_array($payload)) {
                foreach ($payload as $solve) {
                    if (is_array($solve) && isset($solve['id'])) {
                        upsertData($db, $userId, 'solve', $solve['id'], $solve);
                    }
                }
            }
            break;
        case 'DELETE_SOLVES':
            // Intentionally ignored: solve payloads are retained even when references are removed.
            break;
        case 'UPDATE_SESSION':
            if (is_array($payload) && isset($payload['id'])) {
                upsertData($db, $userId, 'session', $payload['id'], $payload);
            }
            break;
        case 'DELETE_SESSION':
            deleteData($db, $userId, 'session', [$payload]);
            break;
        case 'UPDATE_SETTINGS':
            mergeSettingsByKey($db, $userId, $payload);
            break;
        case 'UPDATE_STATS_CONFIG':
            upsertData($db, $userId, 'stats_config', 'MAIN', $payload);
            break;
        case 'UPDATE_GOALS':
            replaceCollectionData($db, $userId, 'goal', $payload);
            break;
        case 'UPDATE_PLUGINS':
            replaceCollectionData($db, $userId, 'plugin', $payload);
            break;
    }
}

function getFullUserData(SQLite3 $db, $userId): array {
    $stmt = $db->prepare('SELECT type, item_id, payload FROM data_store WHERE user_id = ?');
    bindValueAuto($stmt, 1, (int) $userId);
    $result = $stmt->execute();

    $rows = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $rows[] = $row;
    }
    $result->finalize();

    $data = [
        'sessions' => [],
        'solves' => new stdClass(), // Empty object
        'settings' => null,
        'statsConfig' => [],
        'goals' => [],
        'plugins' => [],
        'currentSessionId' => 'default',
        'updatedAt' => time() * 1000
    ];

    foreach ($rows as $row) {
        $payload = json_decode($row['payload'], true);
        switch ($row['type']) {
            case 'session':
                $data['sessions'][] = $payload;
                break;
            case 'solve':
                $data['solves']->{$row['item_id']} = $payload;
                break;
            case 'settings':
                $data['settings'] = $payload;
                break;
            case 'stats_config':
                $data['statsConfig'] = $payload;
                break;
            case 'goal':
                $data['goals'][] = $payload;
                break;
            case 'plugin':
                $data['plugins'][] = $payload;
                break;
        }
    }

    if (!empty($data['sessions'])) {
        $data['currentSessionId'] = $data['sessions'][0]['id'];
    }

    return $data;
}

// --- Main Router ---
$input = json_decode(file_get_contents('php://input'), true);
$route = $input['route'] ?? '';

try {
    $db = getDB();

    if ($route === 'register') {
        $ip = getClientIp();
        $username = trim((string) ($input['username'] ?? ''));
        $password = (string) ($input['password'] ?? '');
        $email = trim((string) ($input['email'] ?? ''));

        enforceAuthRateLimit($db, 'register', $ip, $username, $email);

        if (strlen($username) < 3 || strlen($password) < 6 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            recordAuthAttempt($db, 'register', $ip, 'failed', $username, $email, 'invalid_input');
            throw new ApiException('Invalid registration data.', 400);
        }

        $stmt = $db->prepare('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1');
        bindValueAuto($stmt, 1, $username);
        bindValueAuto($stmt, 2, $email);
        $result = $stmt->execute();
        $exists = $result->fetchArray(SQLITE3_ASSOC) ?: null;
        $result->finalize();
        if ($exists) {
            recordAuthAttempt($db, 'register', $ip, 'failed', $username, $email, 'already_exists');
            throw new ApiException('Unable to register with provided credentials.', 400);
        }

        $hash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $db->prepare('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)');
        bindValueAuto($stmt, 1, $username);
        bindValueAuto($stmt, 2, $email);
        bindValueAuto($stmt, 3, $hash);
        execStatement($stmt);

        $userId = (int) $db->lastInsertRowID();

        $token = generateJWT($userId, $username);
        $userObj = ['id' => $userId, 'username' => $username];

        if (isset($input['initialData']) && is_array($input['initialData'])) {
            $init = $input['initialData'];

            if (!empty($init['sessions']) && is_array($init['sessions'])) {
                foreach ($init['sessions'] as $s) {
                    if (is_array($s) && isset($s['id'])) upsertData($db, $userId, 'session', $s['id'], $s);
                }
            }
            if (!empty($init['solves']) && is_array($init['solves'])) {
                foreach ($init['solves'] as $id => $s) {
                    if (is_array($s)) upsertData($db, $userId, 'solve', $id, $s);
                }
            }
            if (!empty($init['settings'])) {
                upsertData($db, $userId, 'settings', 'MAIN', $init['settings']);
            }
            if (!empty($init['statsConfig'])) {
                upsertData($db, $userId, 'stats_config', 'MAIN', $init['statsConfig']);
            }
            if (!empty($init['goals']) && is_array($init['goals'])) {
                foreach ($init['goals'] as $g) {
                    if (is_array($g) && isset($g['id'])) upsertData($db, $userId, 'goal', $g['id'], $g);
                }
            }
            if (!empty($init['plugins']) && is_array($init['plugins'])) {
                foreach ($init['plugins'] as $p) {
                    if (is_array($p) && isset($p['id'])) upsertData($db, $userId, 'plugin', $p['id'], $p);
                }
            }
        }

        sendNewUserNotification($username, $email, $userId);
        recordAuthAttempt($db, 'register', $ip, 'success', $username, $email, null);

        echo json_encode(['token' => $token, 'user' => $userObj]);
    } elseif ($route === 'login') {
        $ip = getClientIp();
        $username = trim((string) ($input['username'] ?? ''));
        $password = (string) ($input['password'] ?? '');

        enforceAuthRateLimit($db, 'login', $ip, $username, null);

        $stmt = $db->prepare('SELECT id, username, password_hash FROM users WHERE username = ? LIMIT 1');
        bindValueAuto($stmt, 1, $username);
        $result = $stmt->execute();
        $user = $result->fetchArray(SQLITE3_ASSOC) ?: null;
        $result->finalize();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            recordAuthAttempt($db, 'login', $ip, 'failed', $username, null, 'invalid_credentials');
            throw new ApiException('Invalid credentials.', 401);
        }

        $token = generateJWT((int) $user['id'], $user['username']);
        $userObj = ['id' => (int) $user['id'], 'username' => $user['username']];

        $data = getFullUserData($db, (int) $user['id']);
        recordAuthAttempt($db, 'login', $ip, 'success', $username, null, null);

        echo json_encode(['token' => $token, 'user' => $userObj, 'data' => $data]);
    } elseif ($route === 'sync') {
        $jwt = authenticate();
        $userId = (int) $jwt['sub'];

        $actions = $input['actions'] ?? [];
        if (is_array($actions)) {
            foreach ($actions as $action) {
                if (is_array($action)) processSyncAction($db, $userId, $action);
            }
        }

        echo json_encode(['success' => true, 'syncedAt' => time() * 1000]);
    } elseif ($route === 'get_data') {
        $jwt = authenticate();
        $userId = (int) $jwt['sub'];
        $data = getFullUserData($db, $userId);
        echo json_encode($data);
    } else {
        throw new Exception('Invalid route');
    }
} catch (Throwable $e) {
    if ($e instanceof ApiException) {
        http_response_code($e->getStatus());
        echo json_encode(['error' => $e->getMessage()]);
    } else {
        error_log('API error: ' . $e->getMessage());
        http_response_code(500);
        echo json_encode(['error' => 'Request failed']);
    }
}
