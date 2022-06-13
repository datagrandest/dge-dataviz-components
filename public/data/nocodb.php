<?php

// curl --location --request GET "https://nocodb.shogun.ovh/nc/test_1_IoKA/api/v1/Table%202" --header "Accept: application/json" --header "Authorization: Bearer 0tcganM3Q6jGTIId2mmYJ4hE7ovewtIm-DitTv_X"

//The URL we are connecting to.
$url = 'https://nocodb.shogun.ovh/xxx';
$token = 'xxxxxxxxx';

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
if(curl_errno($ch)){
    throw new Exception(curl_error($ch));
}

// $resp = curl_exec($ch);

// $respArray = json_decode($resp);

// echo $respArray;