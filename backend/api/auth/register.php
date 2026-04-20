<?php

session_start();
header('Content-Type: application/json; charset=utf-8');

if (!empty($_SERVER['HTTP_ORIGIN'])) {
    header('Access-Control-Allow-Origin: ' . $_SERVER['HTTP_ORIGIN']);
    header('Vary: Origin');
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

require_once __DIR__ . '/../../config/database.php';

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload']);
    exit;
}

$email = strtolower(trim($data['email'] ?? ''));
$password = (string) ($data['password'] ?? '');

if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Please provide email and password']);
    exit;
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit;
}

if (strlen($password) < 6) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 6 characters']);
    exit;
}

try {
    $pdo = Database::getConnection();

    $existingStmt = $pdo->prepare('SELECT id FROM users WHERE email = :email LIMIT 1');
    $existingStmt->execute(['email' => $email]);

    if ($existingStmt->fetch()) {
        http_response_code(409);
        echo json_encode(['error' => 'Email already exists']);
        exit;
    }

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    $insertStmt = $pdo->prepare('INSERT INTO users (email, password) VALUES (:email, :password)');
    $insertStmt->execute([
        'email' => $email,
        'password' => $passwordHash,
    ]);

    $userId = (int) $pdo->lastInsertId();
    $username = explode('@', $email)[0];

    $_SESSION['user_id'] = $userId;

    http_response_code(201);
    echo json_encode([
        'message' => 'Register successful',
        'user' => [
            'id' => $userId,
            'email' => $email,
            'username' => $username,
        ],
    ]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error during registration']);
}
