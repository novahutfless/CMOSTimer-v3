<?php

declare(strict_types=1);

function cmos_get_app_version(): string {
    $default = '0.0.0';
    $packagePath = dirname(__DIR__, 2) . '/package.json';
    if (!is_file($packagePath)) {
        return $default;
    }

    $json = file_get_contents($packagePath);
    if ($json === false) {
        return $default;
    }

    $data = json_decode($json, true);
    if (!is_array($data) || !isset($data['version']) || !is_string($data['version'])) {
        return $default;
    }

    return $data['version'];
}

function cmos_get_user_count(): ?int {
    $configPath = dirname(__DIR__, 2) . '/server/config.php';
    if (!is_file($configPath)) {
        return null;
    }

    require_once $configPath;

    if (!defined('SQLITE_DB_PATH') || !extension_loaded('sqlite3')) {
        return null;
    }

    try {
        $db = new SQLite3(SQLITE_DB_PATH, SQLITE3_OPEN_READONLY);
        $db->enableExceptions(true);
        $result = $db->query('SELECT COUNT(*) AS total FROM users');
        $row = $result ? $result->fetchArray(SQLITE3_ASSOC) : null;
        if ($result instanceof SQLite3Result) {
            $result->finalize();
        }
        $db->close();

        if (!is_array($row) || !isset($row['total'])) {
            return null;
        }

        return (int) $row['total'];
    } catch (Throwable $e) {
        return null;
    }
}

$appVersion = cmos_get_app_version();
$userCount = cmos_get_user_count();

?>
