<?php

session_start();
header('Content-Type: application/json; charset=utf-8');

if (!empty($_SERVER['HTTP_ORIGIN'])) {
	header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
	header('Vary: Origin');
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
	http_response_code(204);
	exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
	http_response_code(405);
	echo json_encode(['error' => 'Method not allowed']);
	exit;
}

if (empty($_SESSION['user_id'])) {
	http_response_code(401);
	echo json_encode(['error' => 'Unauthenticated']);
	exit;
}

require_once __DIR__ . '/../../config/database.php';

try {
	$pdo = Database::getConnection();
	$stmt = $pdo->prepare('SELECT id, email FROM users WHERE id = :id LIMIT 1');
	$stmt->execute(['id' => (int) $_SESSION['user_id']]);
	$user = $stmt->fetch();

	if (!$user) {
		http_response_code(401);
		echo json_encode(['error' => 'Unauthenticated']);
		exit;
	}

	echo json_encode([
		'user' => [
			'id' => (int) $user['id'],
			'email' => $user['email'],
			'username' => explode('@', $user['email'])[0],
		],
	]);
} catch (Throwable $error) {
	http_response_code(500);
	echo json_encode(['error' => 'Server error']);
}

