<?php
require "config.php";

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $input = json_decode(file_get_contents("php://input"), true);

    $description = $input['description'] ?? '';
    $image = $input['image'] ?? null; // base64 képeként érkezik
    $latitude = $input['latitude'] ?? null;
    $longitude = $input['longitude'] ?? null;
    $user_id = $input['user_id'] ?? 1;

    if (empty($description) || $latitude === null || $longitude === null) {
        echo json_encode(["success" => false, "message" => "Hiányzó adatok!"]);
        exit;
    }

    // Kép mentése (ha van)
    $image_path = null;
    if ($image) {
        $image_data = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $image));
        $filename = "uploads/" . time() . "_" . uniqid() . ".jpg";
        if (!is_dir("uploads")) mkdir("uploads", 0777, true);
        file_put_contents($filename, $image_data);
        $image_path = $filename;
    }

    $stmt = $pdo->prepare("INSERT INTO reports (user_id, description, image_path, latitude, longitude) VALUES (?, ?, ?, ?, ?)");
    $success = $stmt->execute([$user_id, $description, $image_path, $latitude, $longitude]);

    if ($success) {
        echo json_encode(["success" => true, "message" => "Bejelentés sikeresen elküldve!"]);
    } else {
        echo json_encode(["success" => false, "message" => "Hiba a mentés során."]);
    }
}
?>