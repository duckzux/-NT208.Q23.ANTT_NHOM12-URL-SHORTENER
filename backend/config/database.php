<?php

class Database
{
	private static $connection = null;

	private static function loadEnv()
	{
		$envFile = dirname(__DIR__, 2) . '/.env';
		if (!file_exists($envFile)) {
			return;
		}
		$lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
		foreach ($lines as $line) {
			$line = trim($line);
			if ($line === '' || strpos($line, '#') === 0) {
				continue;
			}
			if (strpos($line, '=') === false) {
				continue;
			}
			[$key, $value] = explode('=', $line, 2);
			$key = trim($key);
			$value = trim($value);
			if ($key !== '' && getenv($key) === false) {
				putenv("{$key}={$value}");
			}
		}
	}

	public static function getConnection()
	{
		if (self::$connection instanceof PDO) {
			return self::$connection;
		}

		self::loadEnv();

		$host = getenv('DB_HOST') ?: '127.0.0.1';
		$port = getenv('DB_PORT') ?: '3306';
		$dbName = getenv('DB_NAME') ?: 'url_shortener';
		$username = getenv('DB_USER') ?: 'root';
		$password = getenv('DB_PASSWORD');
		if ($password === false || $password === '') {
			$password = getenv('DB_PASS') ?: '';
		}

		$dsn = "mysql:host={$host};port={$port};dbname={$dbName};charset=utf8mb4";

		self::$connection = new PDO($dsn, $username, $password, [
			PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
			PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
			PDO::ATTR_EMULATE_PREPARES => false,
		]);

		return self::$connection;
	}
}

