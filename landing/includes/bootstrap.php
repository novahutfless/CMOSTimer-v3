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

    if (!defined('DB_HOST') || !defined('DB_NAME') || !defined('DB_USER') || !defined('DB_PASS')) {
        return null;
    }

    try {
        $dsn = 'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4';
        $pdo = new PDO($dsn, DB_USER, DB_PASS, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
        $stmt = $pdo->query('SELECT COUNT(*) AS total FROM users');
        $row = $stmt->fetch();

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