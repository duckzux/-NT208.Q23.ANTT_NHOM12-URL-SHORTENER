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

try {
    $pdo = Database::getConnection();

    $stmt = $pdo->prepare('SELECT id, email, password FROM users WHERE email = :email LIMIT 1');
    $stmt->execute(['email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid email or password']);
        exit;
    }

    $_SESSION['user_id'] = (int) $user['id'];

    http_response_code(200);
    echo json_encode([
        'message' => 'Login successful',
        'user' => [
            'id' => (int) $user['id'],
            'email' => $user['email'],
            'username' => explode('@', $user['email'])[0],
        ],
    ]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error during login']);
}
