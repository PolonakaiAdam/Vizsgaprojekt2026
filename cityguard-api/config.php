<?php
// CORS engedélyezése – fontos, hogy a React Native app (telefon) elérje a szervert
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// Adatbázis kapcsolat beállításai
$host = "localhost";        // XAMPP esetén általában localhost
$user = "root";             // XAMPP alapértelmezett felhasználó
$pass = "";                 // XAMPP alapértelmezetten üres jelszó
$dbname = "cityguard";   // <<< IDE ÍRD A SAJÁT ADATBÁZISOD NEVÉT!

try {
    // PDO kapcsolat létrehozása
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $user, $pass);
    
    // Hibakezelés bekapcsolása (fejlesztéskor nagyon hasznos)
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Alapértelmezett fetch mód: asszociatív tömb
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    
} catch (PDOException $e) {
    // Ha nem sikerül csatlakozni, JSON hibával válaszolunk
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Adatbázis kapcsolódási hiba: " . $e->getMessage()
    ]);
    exit;
}
?>