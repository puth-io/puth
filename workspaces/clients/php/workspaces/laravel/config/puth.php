<?php

return [
    'instance' => [
        'url' => env('PUTH_INSTANCE_URL', 'http://127.0.0.1:7345'),
    ],
    
    'debug' => env('PUTH_DEBUG', true),
    
    'playground' => env('PUTH_PLAYGROUND', 'https://playground.puth.dev/'),
];
