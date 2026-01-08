<?php
// CORS engedélyezése – nélkülözhetetlen a React Native appból való híváshoz
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// OPTIONS elő-kérés kezelése (CORS miatt fontos)
if ($_SERVER["REQUEST_METHOD"] == "OPTIONS") {
    http_response_code(200);
    exit();
}

require "config.php";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    // JSON bemenet beolvasása
    $input = json_decode(file_get_contents("php://input"), true);

    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    // Alap ellenőrzés
    if (empty($email) || empty($password)) {
        echo json_encode([
            "success" => false,
            "message" => "Email és jelszó megadása kötelező!"
        ]);
        exit;
    }

    try {
        // Felhasználó keresése email alapján
        $stmt = $pdo->prepare("SELECT id, name, password FROM users WHERE email = ?");
        $stmt->execute([$email]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            // Sikeres bejelentkezés
            echo json_encode([
                "success" => true,
                "message" => "Sikeres bejelentkezés!",
                "user" => [
                    "id" => (int)$user['id'],
                    "name" => $user['name'],
                    "email" => $email
                ]
            ]);
        } else {
            // Hibás adatok
            echo json_encode([
                "success" => false,
                "message" => "Hibás email vagy jelszó!"
            ]);
        }
    } catch (Exception $e) {
        // Bármi más hiba (pl. adatbázis)
        echo json_encode([
            "success" => false,
            "message" => "Szerver hiba történt."
        ]);
    }
} else {
    // Nem POST kérés
    echo json_encode([
        "success" => false,
        "message" => "Érvénytelen kérés."
    ]);
}
?>