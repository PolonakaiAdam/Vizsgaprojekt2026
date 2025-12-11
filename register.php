<?php
header('Content-Type: application/json');
$conn = new mysqli("localhost","root","","cityguard");
if($conn->connect_error){ die(json_encode(["success"=>false,"message"=>"Connection failed"])); }

$data = json_decode(file_get_contents("php://input"), true);
$email = $conn->real_escape_string($data['email']);
$password = password_hash($data['password'], PASSWORD_DEFAULT);

$sql = "INSERT INTO users (email,password) VALUES ('$email','$password')";
if($conn->query($sql)===TRUE) echo json_encode(["success"=>true,"message"=>"User registered"]);
else echo json_encode(["success"=>false,"message"=>$conn->error]);
$conn->close();
?>
