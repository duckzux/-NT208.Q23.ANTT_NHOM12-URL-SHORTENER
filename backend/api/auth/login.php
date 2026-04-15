<?php
session_start();
header('Content-Type: application/json');

// require_once '../../config/database.php';
// $pdo = Database::getInstance()->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->email) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(["error" => "Vui lòng nhập đầy đủ thông tin"]);
    exit;
}

$email = $data->email;

// Tìm user theo email
$stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);

// Kiểm tra user có tồn tại và password có khớp không
if ($user && password_verify($data->password, $user['password'])) {
    // LƯU TRẠNG THÁI VÀO SESSION
    $_SESSION['user_id'] = $user['id'];
    
    http_response_code(200);
    echo json_encode([
        "message" => "Đăng nhập thành công",
        "user_id" => $user['id']
    ]);
} else {
    http_response_code(401);
    echo json_encode(["error" => "Sai email hoặc mật khẩu"]);
}
?>