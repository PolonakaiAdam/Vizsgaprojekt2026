<?php
require "config.php";

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $input = json_decode(file_get_contents("php://input"), true);

    $name = trim($input['name'] ?? '');
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (empty($name) || empty($email) || empty($password)) {
        echo json_encode(["success" => false, "message" => "Minden mező kitöltése kötelező!"]);
        exit;
    }

    // Email ellenőrzés
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->rowCount() > 0) {
        echo json_encode(["success" => false, "message" => "Ez az email már regisztrálva van!"]);
        exit;
    }

    $hashed = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
    $success = $stmt->execute([$name, $email, $hashed]);

    if ($success) {
        echo json_encode(["success" => true, "message" => "Sikeres regisztráció! Most bejelentkezhetsz."]);
    } else {
        echo json_encode(["success" => false, "message" => "Hiba a regisztráció során."]);
    }
}
?>