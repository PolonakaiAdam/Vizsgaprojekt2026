<?php
header('Content-Type: application/json');
$conn = new mysqli("localhost","root","","cityguard");
$data = json_decode(file_get_contents("php://input"), true);

$user_id = intval($data['user_id']);
$desc = $conn->real_escape_string($data['description']);
$image = $conn->real_escape_string($data['image']);
$lat = floatval($data['latitude']);
$lon = floatval($data['longitude']);

$sql = "INSERT INTO reports (user_id, description, image, latitude, longitude) VALUES ($user_id,'$desc','$image',$lat,$lon)";
if($conn->query($sql)===TRUE) echo json_encode(["success"=>true,"message"=>"Report submitted"]);
else echo json_encode(["success"=>false,"message"=>$conn->error]);
$conn->close();
?>
