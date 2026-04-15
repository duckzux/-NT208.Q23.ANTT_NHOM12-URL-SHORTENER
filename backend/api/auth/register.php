<!--POST: validate email (filter_var): pass>=6 chars, check trùng, 
pass_hash(BCRYPT) INSERT USER, RESPONE 201-->

<?php
// Bật session và hiển thị lỗi cơ bản
session_start();
header('Content-Type: application/json');

// Giả sử bạn đã có file cấu hình kết nối DB bằng PDO
// require_once '../../config/database.php';
// $pdo = Database::getInstance()->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->email) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(["error" => "Vui lòng nhập đầy đủ thông tin"]);
    exit;
}

$email = $data->email;
$password = password_hash($data->password, PASSWORD_BCRYPT); // Mã hóa mật khẩu

try {
    // Chuẩn bị câu lệnh SQL để chống SQL Injection
    $stmt = $pdo->prepare("INSERT INTO users (email, password) VALUES (?, ?)");
    $stmt->execute([$email, $password]);
    
    http_response_code(201);
    echo json_encode(["message" => "Đăng ký thành công"]);
} catch (PDOException $e) {
    if ($e->getCode() == 23000) { // Mã lỗi trùng lặp UNIQUE (email đã tồn tại)
        http_response_code(409);
        echo json_encode(["error" => "Email đã được sử dụng"]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Lỗi server"]);
    }
}
?>