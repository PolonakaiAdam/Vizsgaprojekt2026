<?php
header('Content-Type: application/json');
$conn = new mysqli("localhost","root","","cityguard");
$data = json_decode(file_get_contents("php://input"), true);

$email = $conn->real_escape_string($data['email']);
$password = $data['password'];

$sql = "SELECT * FROM users WHERE email='$email'";
$result = $conn->query($sql);
if($result->num_rows>0){
    $user = $result->fetch_assoc();
    if(password_verify($password,$user['password'])){
        echo json_encode(["success"=>true,"message"=>"Login successful","user_id"=>$user['id']]);
    } else echo json_encode(["success"=>false,"message"=>"Invalid password"]);
} else echo json_encode(["success"=>false,"message"=>"User not found"]);
$conn->close();
?>
