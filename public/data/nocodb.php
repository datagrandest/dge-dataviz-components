<?php

//The URL we are connecting to.
$url = 'https://nocodb.shogun.ovh/api/v1/db/data/v1/test/COMPANY';
$token = 'p3aB0jYGCc-qHSZ0T3iyaZeUxiZG_si8yVG9jU2U';

//Initiate cURL.
$ch = curl_init($url);

$headers = [
    "Content-Type: application/json; charset=utf-8",
    "xc-token: " . $token
];
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

//Disable CURLOPT_SSL_VERIFYHOST and CURLOPT_SSL_VERIFYPEER by
//setting them to false.
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

//Execute the request.
$result = curl_exec($ch);

//Check for errors.
if(curl_errno($ch)){
    throw new Exception(curl_error($ch));
}

// $result = json_decode($result, true);
// echo json_encode($result['list']);

echo $result;