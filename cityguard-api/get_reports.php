<?php
// CORS engedélyezése – elengedhetetlen a React Native appból való híváshoz
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// OPTIONS elő-kérés kezelése (CORS preflight)
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit();
}

require "config.php";

try {
    // Minden bejelentés lekérdezése, legújabb elöl
    $stmt = $pdo->prepare("
        SELECT 
            r.id,
            r.description,
            r.status,
            r.latitude,
            r.longitude,
            r.image_path,
            r.created_at,
            u.name AS user_name
        FROM reports r
        LEFT JOIN users u ON r.user_id = u.id
        ORDER BY r.created_at DESC
    ");

    $stmt->execute();
    $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Ha nincs státusz beállítva, alapértelmezett legyen "Új"
    foreach ($reports as &$report) {
        if (empty($report['status'])) {
            $report['status'] = 'Új';
        }
        // Ha nincs user_name (pl. törölt felhasználó), írjunk "Ismeretlen"
        if (empty($report['user_name'])) {
            $report['user_name'] = 'Ismeretlen felhasználó';
        }
    }
    unset($report); // referencia törlése

    // Mindig objektum formátumban küldjük vissza, success kulccsal
    echo json_encode([
        "success" => true,
        "reports" => $reports
    ]);

} catch (Exception $e) {
    // Hibakezelés – éles környezetben ne mutassuk a részleteket a kliensnek
    error_log("Hiba a get_reports.php-ban: " . $e->getMessage());

    echo json_encode([
        "success" => false,
        "message" => "Szerver hiba történt a bejelentések betöltésekor."
    ]);
}
?>