<?php
// CORS engedélyezése – React Native appból való híváshoz szükséges
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// OPTIONS elő-kérés kezelése (CORS preflight)
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

require "config.php";

if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    echo json_encode(["success" => false, "message" => "Érvénytelen kérés típusa"]);
    exit();
}

// JSON bemenet beolvasása
$input = json_decode(file_get_contents("php://input"), true);

$user_id    = $input['user_id'] ?? null;
$report_id  = $input['report_id'] ?? null;
$new_status = $input['new_status'] ?? null;

// Alapvető ellenőrzések
if (!$user_id || !$report_id || !$new_status) {
    echo json_encode([
        "success" => false,
        "message" => "Hiányzó adatok: user_id, report_id vagy new_status"
    ]);
    exit();
}

// Engedélyezett státuszok
$allowed_statuses = ['Új', 'Folyamatban', 'Megoldva', 'Elutasítva'];
if (!in_array($new_status, $allowed_statuses)) {
    echo json_encode([
        "success" => false,
        "message" => "Érvénytelen státusz érték"
    ]);
    exit();
}

try {
    // 1. Ellenőrizzük, hogy a felhasználó létezik-e és admin-e
    $stmt = $pdo->prepare("SELECT is_admin FROM users WHERE id = ?");
    $stmt->execute([$user_id]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        echo json_encode([
            "success" => false,
            "message" => "Érvénytelen felhasználó"
        ]);
        exit();
    }

    if (!(bool)$user['is_admin']) {
        echo json_encode([
            "success" => false,
            "message" => "Nincs jogosultságod a státusz módosításához!"
        ]);
        exit();
    }

    // 2. Ellenőrizzük, hogy a bejelentés létezik-e (opcionális, de ajánlott)
    $stmt = $pdo->prepare("SELECT id FROM reports WHERE id = ?");
    $stmt->execute([$report_id]);
    if (!$stmt->fetch()) {
        echo json_encode([
            "success" => false,
            "message" => "Nem létező bejelentés"
        ]);
        exit();
    }

    // 3. Státusz frissítése
    $stmt = $pdo->prepare("UPDATE reports SET status = ? WHERE id = ?");
    $success = $stmt->execute([$new_status, $report_id]);

    if ($success && $stmt->rowCount() > 0) {
        echo json_encode([
            "success" => true,
            "message" => "Státusz sikeresen frissítve: $new_status"
        ]);
    } else {
        echo json_encode([
            "success" => false,
            "message" => "Nem történt módosítás (lehet, hogy már ez a státusz van beállítva)"
        ]);
    }

} catch (Exception $e) {
    // Hibakezelés – éles környezetben ne jelenítsük meg a részleteket!
    error_log("Hiba az update_status.php-ban: " . $e->getMessage());

    echo json_encode([
        "success" => false,
        "message" => "Szerver hiba történt a művelet során"
    ]);
}
?>