<?php
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../api/config.php';

const PUBLIC_NOT_FOUND_MESSAGE = 'User not found';
const DNF_VALUE = 999999999;

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload);
    exit;
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

function getDb(): SQLite3 {
    if (!extension_loaded('sqlite3')) {
        throw new RuntimeException('SQLite3 extension is not loaded.');
    }

    $dbPath = defined('SQLITE_DB_PATH') ? SQLITE_DB_PATH : (__DIR__ . '/../api/data/cmostimer.sqlite');
    $db = new SQLite3($dbPath, SQLITE3_OPEN_READONLY);
    $db->enableExceptions(true);
    $db->busyTimeout(defined('SQLITE_BUSY_TIMEOUT_MS') ? SQLITE_BUSY_TIMEOUT_MS : 5000);

    return $db;
}

function fetchSinglePayload(SQLite3 $db, int $userId, string $type, string $itemId): ?array {
    $stmt = $db->prepare('SELECT payload FROM data_store WHERE user_id = ? AND type = ? AND item_id = ? LIMIT 1');
    bindValueAuto($stmt, 1, $userId);
    bindValueAuto($stmt, 2, $type);
    bindValueAuto($stmt, 3, $itemId);
    $result = $stmt->execute();
    $row = $result ? ($result->fetchArray(SQLITE3_ASSOC) ?: null) : null;
    if ($result instanceof SQLite3Result) {
        $result->finalize();
    }

    if (!$row || !isset($row['payload'])) {
        return null;
    }

    $decoded = json_decode($row['payload'], true);
    return is_array($decoded) ? $decoded : null;
}

function fetchPayloadsByIds(SQLite3 $db, int $userId, string $type, array $itemIds): array {
    if (empty($itemIds)) {
        return [];
    }

    $placeholders = implode(',', array_fill(0, count($itemIds), '?'));
    $sql = "SELECT item_id, payload FROM data_store WHERE user_id = ? AND type = ? AND item_id IN ($placeholders)";
    $stmt = $db->prepare($sql);
    bindValueAuto($stmt, 1, $userId);
    bindValueAuto($stmt, 2, $type);
    foreach (array_values($itemIds) as $idx => $id) {
        bindValueAuto($stmt, $idx + 3, (string) $id);
    }

    $result = $stmt->execute();
    $map = [];

    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $decoded = json_decode($row['payload'], true);
        if (is_array($decoded)) {
            $map[(string) $row['item_id']] = $decoded;
        }
    }

    if ($result instanceof SQLite3Result) {
        $result->finalize();
    }

    return $map;
}

function getPenaltyAddition(string $penalty): int {
    switch ($penalty) {
        case 'PLUS_TWO':
            return 2000;
        case 'PLUS_FOUR':
            return 4000;
        case 'PLUS_SIX':
            return 6000;
        case 'PLUS_EIGHT':
            return 8000;
        case 'PLUS_TEN':
            return 10000;
        case 'PLUS_TWELVE':
            return 12000;
        case 'PLUS_FOURTEEN':
            return 14000;
        case 'PLUS_SIXTEEN':
            return 16000;
        default:
            return 0;
    }
}

function getSolveTime(array $solve): ?float {
    $penalty = (string) ($solve['penalty'] ?? 'NONE');
    if ($penalty === 'DNF' || $penalty === 'DNS') {
        return null;
    }

    if (!isset($solve['time']) || !is_numeric($solve['time'])) {
        return null;
    }

    return (float) $solve['time'] + getPenaltyAddition($penalty);
}

function calculateMean(array $window): ?float {
    if (empty($window)) {
        return null;
    }

    $sum = 0.0;
    foreach ($window as $solve) {
        $t = getSolveTime($solve);
        if ($t === null) {
            return DNF_VALUE;
        }
        $sum += $t;
    }

    return $sum / count($window);
}

function calculateAverage(array $window): ?float {
    $size = count($window);
    if ($size === 0) {
        return null;
    }

    $numDiscard = (int) ceil($size * 0.05);
    $dnfCount = 0;
    $times = [];

    foreach ($window as $solve) {
        $t = getSolveTime($solve);
        if ($t === null) {
            $dnfCount++;
            $times[] = INF;
        } else {
            $times[] = $t;
        }
    }

    if ($dnfCount > $numDiscard) {
        return DNF_VALUE;
    }

    sort($times, SORT_NUMERIC);
    $validTimes = array_slice($times, $numDiscard, $size - ($numDiscard * 2));
    if (empty($validTimes)) {
        return null;
    }

    return array_sum($validTimes) / count($validTimes);
}

function calculateStandardDeviation(array $window): ?float {
    if (empty($window)) {
        return null;
    }

    $times = [];
    foreach ($window as $solve) {
        $t = getSolveTime($solve);
        if ($t === null) {
            return DNF_VALUE;
        }
        $times[] = $t;
    }

    $mean = array_sum($times) / count($times);
    $sumSq = 0.0;
    foreach ($times as $time) {
        $sumSq += ($time - $mean) ** 2;
    }

    return sqrt($sumSq / count($times));
}

function calculateSuccessRate(array $window): ?float {
    if (empty($window)) {
        return 0.0;
    }

    $success = 0;
    foreach ($window as $solve) {
        $penalty = (string) ($solve['penalty'] ?? 'NONE');
        if ($penalty !== 'DNF' && $penalty !== 'DNS') {
            $success++;
        }
    }

    return $success / count($window);
}

function calculateWeightedAverage(array $window): ?float {
    if (empty($window)) {
        return null;
    }

    $numerator = 0.0;
    $denominator = 0.0;

    foreach (array_values($window) as $idx => $solve) {
        $t = getSolveTime($solve);
        if ($t === null) {
            return DNF_VALUE;
        }

        $weight = $idx + 1;
        $numerator += $t * $weight;
        $denominator += $weight;
    }

    if ($denominator <= 0) {
        return null;
    }

    return $numerator / $denominator;
}

function calculateWindowStat(array $window, string $type): ?float {
    switch ($type) {
        case 'MEAN':
            return calculateMean($window);
        case 'AVERAGE':
            return calculateAverage($window);
        case 'STD_DEV':
            return calculateStandardDeviation($window);
        case 'SUCCESS_RATE':
            return calculateSuccessRate($window);
        case 'WEIGHTED_AVG':
            return calculateWeightedAverage($window);
        default:
            return null;
    }
}

function getBestStat(array $solves, string $type, int $size): array {
    $history = array_values(array_filter($solves, static fn ($s) => is_array($s)));
    usort($history, static function ($a, $b): int {
        $ta = (int) ($a['timestamp'] ?? 0);
        $tb = (int) ($b['timestamp'] ?? 0);
        return $ta <=> $tb;
    });

    if ($type === 'SINGLE') {
        $best = INF;
        $bestSolve = null;

        foreach ($history as $solve) {
            $t = getSolveTime($solve);
            if ($t === null || $t === DNF_VALUE) {
                continue;
            }
            if ($t < $best) {
                $best = $t;
                $bestSolve = $solve;
            }
        }

        if ($bestSolve === null) {
            return ['value' => null, 'timestamp' => null];
        }

        return [
            'value' => $best,
            'timestamp' => isset($bestSolve['timestamp']) ? (int) $bestSolve['timestamp'] : null,
        ];
    }

    if ($size <= 0 || count($history) < $size) {
        return ['value' => null, 'timestamp' => null];
    }

    $isHigherBetter = ($type === 'SUCCESS_RATE');
    $bestValue = $isHigherBetter ? -INF : INF;
    $bestTimestamp = null;

    for ($i = 0; $i <= count($history) - $size; $i++) {
        $window = array_slice($history, $i, $size);
        $value = calculateWindowStat($window, $type);
        if ($value === null || $value === DNF_VALUE) {
            continue;
        }

        $isBetter = $isHigherBetter ? ($value > $bestValue) : ($value < $bestValue);
        if ($isBetter) {
            $bestValue = $value;
            $last = $window[count($window) - 1] ?? null;
            $bestTimestamp = (is_array($last) && isset($last['timestamp'])) ? (int) $last['timestamp'] : null;
        }
    }

    if (!is_finite($bestValue)) {
        return ['value' => null, 'timestamp' => null];
    }

    return ['value' => $bestValue, 'timestamp' => $bestTimestamp];
}

function loadPublicPbData(SQLite3 $db, string $username): array {
    $stmt = $db->prepare('SELECT id, username FROM users WHERE username = ? LIMIT 1');
    bindValueAuto($stmt, 1, $username);
    $result = $stmt->execute();
    $user = $result ? ($result->fetchArray(SQLITE3_ASSOC) ?: null) : null;
    if ($result instanceof SQLite3Result) {
        $result->finalize();
    }

    if (!$user) {
        throw new RuntimeException(PUBLIC_NOT_FOUND_MESSAGE, 404);
    }

    $userId = (int) $user['id'];
    $settings = fetchSinglePayload($db, $userId, 'settings', 'MAIN');
    $pbSheet = is_array($settings['pbSheet'] ?? null) ? $settings['pbSheet'] : null;

    if (!$pbSheet || !($pbSheet['enabled'] ?? false)) {
        throw new RuntimeException(PUBLIC_NOT_FOUND_MESSAGE, 404);
    }

    $title = trim((string) ($pbSheet['title'] ?? ''));
    $configuredSessionIds = array_values(array_unique(array_map(
        static fn ($id) => (string) $id,
        array_filter($pbSheet['sessionIds'] ?? [], static fn ($id) => is_scalar($id) && trim((string) $id) !== '')
    )));

    $configuredStats = [];
    foreach (($pbSheet['stats'] ?? []) as $stat) {
        if (!is_array($stat)) {
            continue;
        }

        $type = strtoupper((string) ($stat['type'] ?? ''));
        $size = (int) ($stat['size'] ?? 1);
        if ($type === '') {
            continue;
        }

        $configuredStats[] = [
            'type' => $type,
            'size' => max(1, $size),
        ];
    }

    if (empty($configuredStats)) {
        $configuredStats[] = ['type' => 'SINGLE', 'size' => 1];
    }

    $showDate = (bool) ($pbSheet['showDate'] ?? false);
    $showSolveCount = (bool) ($pbSheet['showSolveCount'] ?? false);

    $sessionsById = fetchPayloadsByIds($db, $userId, 'session', $configuredSessionIds);

    $allSolveIds = [];
    foreach ($configuredSessionIds as $sessionId) {
        $session = $sessionsById[$sessionId] ?? null;
        if (!is_array($session)) {
            continue;
        }

        foreach (($session['solveIds'] ?? []) as $solveId) {
            if (is_scalar($solveId)) {
                $allSolveIds[] = (string) $solveId;
            }
        }
    }

    $allSolveIds = array_values(array_unique($allSolveIds));
    $solvesById = fetchPayloadsByIds($db, $userId, 'solve', $allSolveIds);

    $sessionRows = [];
    foreach ($configuredSessionIds as $sessionId) {
        $session = $sessionsById[$sessionId] ?? null;
        if (!is_array($session)) {
            continue;
        }

        $sessionSolves = [];
        foreach (($session['solveIds'] ?? []) as $solveId) {
            $sid = (string) $solveId;
            if (isset($solvesById[$sid]) && is_array($solvesById[$sid])) {
                $sessionSolves[] = $solvesById[$sid];
            }
        }

        $stats = [];
        foreach ($configuredStats as $statCfg) {
            $best = getBestStat($sessionSolves, $statCfg['type'], $statCfg['size']);

            $statItem = [
                'type' => $statCfg['type'],
                'size' => $statCfg['size'],
                'value' => $best['value'],
            ];

            if ($showDate) {
                $statItem['timestamp'] = $best['timestamp'];
            }
            if ($showSolveCount) {
                $statItem['solveCount'] = count($sessionSolves);
            }

            $stats[] = $statItem;
        }

        $sessionRows[] = [
            'name' => (string) ($session['name'] ?? 'Unnamed Session'),
            'stats' => $stats,
        ];
    }

    return [
        'title' => $title !== '' ? $title : 'PB Sheet',
        'username' => (string) $user['username'],
        'sessions' => $sessionRows,
        'showDate' => $showDate,
        'showSolveCount' => $showSolveCount,
    ];
}

try {
    if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
        respond(405, ['error' => 'Method not allowed']);
    }

    $input = json_decode(file_get_contents('php://input') ?: '{}', true);
    $username = trim((string) ($input['username'] ?? ''));

    if ($username === '') {
        respond(400, ['error' => 'Username is required']);
    }

    $db = getDb();
    $data = loadPublicPbData($db, $username);
    respond(200, ['data' => $data]);
} catch (Throwable $e) {
    $status = ($e->getCode() === 404) ? 404 : 500;
    $message = ($status === 404) ? PUBLIC_NOT_FOUND_MESSAGE : 'Request failed';
    respond($status, ['error' => $message]);
}
