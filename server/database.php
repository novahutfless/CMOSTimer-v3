<?php

declare(strict_types=1);

require_once __DIR__ . '/config.php';

function cmosOpenDatabase(bool $readOnly = false): SQLite3 {
    if (!extension_loaded('sqlite3')) {
        throw new RuntimeException('SQLite3 extension is not loaded.');
    }

    $dbPath = defined('SQLITE_DB_PATH') ? SQLITE_DB_PATH : (__DIR__ . '/data/cmostimer.sqlite');
    $dbDir = dirname($dbPath);
    if (!$readOnly && !is_dir($dbDir) && !mkdir($dbDir, 0755, true) && !is_dir($dbDir)) {
        throw new RuntimeException('Failed to create database directory.');
    }

    $flags = $readOnly
        ? SQLITE3_OPEN_READONLY
        : SQLITE3_OPEN_READWRITE | SQLITE3_OPEN_CREATE;
    $db = new SQLite3($dbPath, $flags);
    $db->enableExceptions(true);
    $db->busyTimeout(defined('SQLITE_BUSY_TIMEOUT_MS') ? SQLITE_BUSY_TIMEOUT_MS : 5000);

    if (!$readOnly) {
        $schema = file_get_contents(__DIR__ . '/schema.sql');
        if ($schema === false) {
            throw new RuntimeException('Could not read database schema.');
        }
        $db->exec($schema);
    }

    return $db;
}
