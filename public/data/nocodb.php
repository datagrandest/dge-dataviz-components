<?php

// curl --location --request GET "https://nocodb.mydomain.ext/nc/test_1_IoKA/api/v1/Table1" --header "Accept: application/json" --header "Authorization: Bearer XXX"

//The URL we are connecting to.
$url = 'https://...';
$token = 'XXX';

//Initiate cURL.
$ch = curl_init($url);


$headers = [
    "Content-Type: application/json; charset=utf-8",
    "xc-token: " . $token
];
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

//Disable CURLOPT_SSL_VERIFYHOST and CURLOPT_SSL_VERIFYPEER by
//setting them to false.
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

//Execute the request.
curl_exec($ch);

//Check for errors.
if (curl_errno($ch)) {
    throw new Exception(curl_error($ch));
}

// $resp = curl_exec($ch);

// $respArray = json_decode($resp);

// echo $respArray;