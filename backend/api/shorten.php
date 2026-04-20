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

require_once __DIR__ . '/../config/database.php';

function base62_encode(int $num): string
{
    $chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    $result = '';
    while ($num > 0) {
        $result = $chars[$num % 62] . $result;
        $num = intdiv($num, 62);
    }
    return str_pad($result, 6, '0', STR_PAD_LEFT);
}

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload']);
    exit;
}

$longUrl     = trim($data['longUrl'] ?? '');
$customAlias = trim($data['customAlias'] ?? '');
$expiresAt   = trim($data['expiresAt'] ?? '');

if ($longUrl === '') {
    http_response_code(400);
    echo json_encode(['error' => 'longUrl is required']);
    exit;
}

if (!filter_var($longUrl, FILTER_VALIDATE_URL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid URL format']);
    exit;
}

if ($customAlias !== '') {
    if (!preg_match('/^[a-zA-Z0-9\-_]{3,30}$/', $customAlias)) {
        http_response_code(400);
        echo json_encode(['error' => 'Custom alias must be 3–30 characters (letters, digits, - or _)']);
        exit;
    }
}

$expiresAtValue = null;
if ($expiresAt !== '') {
    $ts = strtotime($expiresAt);
    if ($ts === false || $ts <= time()) {
        http_response_code(400);
        echo json_encode(['error' => 'Expiration date must be a future date']);
        exit;
    }
    $expiresAtValue = date('Y-m-d H:i:s', $ts);
}

$userId = isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;

try {
    $pdo = Database::getConnection();

    // Check custom alias uniqueness
    if ($customAlias !== '') {
        $check = $pdo->prepare('SELECT id FROM urls WHERE short_code = :code LIMIT 1');
        $check->execute(['code' => $customAlias]);
        if ($check->fetch()) {
            http_response_code(409);
            echo json_encode(['error' => 'Custom alias is already in use']);
            exit;
        }
    }

    // Insert with temporary placeholder; real short_code derived from auto-increment ID
    $stmt = $pdo->prepare(
        'INSERT INTO urls (short_code, long_url, user_id, expires_at) VALUES (:short_code, :long_url, :user_id, :expires_at)'
    );

    $placeholderCode = $customAlias !== '' ? $customAlias : '__tmp__';

    $stmt->execute([
        'short_code' => $placeholderCode,
        'long_url'   => $longUrl,
        'user_id'    => $userId,
        'expires_at' => $expiresAtValue,
    ]);

    $newId = (int) $pdo->lastInsertId();

    if ($customAlias === '') {
        $shortCode = base62_encode($newId);
        $upd = $pdo->prepare('UPDATE urls SET short_code = :code WHERE id = :id');
        $upd->execute(['code' => $shortCode, 'id' => $newId]);
    } else {
        $shortCode = $customAlias;
    }

    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host     = $_SERVER['HTTP_HOST'] ?? 'localhost';
    $appUrl   = getenv('APP_URL') ?: "{$protocol}://{$host}";
    $shortUrl = rtrim($appUrl, '/') . '/r/' . $shortCode;

    http_response_code(201);
    echo json_encode([
        'shortCode' => $shortCode,
        'shortUrl'  => $shortUrl,
        'longUrl'   => $longUrl,
        'createdAt' => date('c'),
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
