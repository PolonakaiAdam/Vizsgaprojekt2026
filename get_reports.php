<?php
header('Content-Type: application/json');
$conn = new mysqli("localhost","root","","cityguard");
$result = $conn->query("SELECT * FROM reports ORDER BY created_at DESC");
$reports = [];
while($row=$result->fetch_assoc()) $reports[] = $row;
echo json_encode($reports);
$conn->close();
?>
