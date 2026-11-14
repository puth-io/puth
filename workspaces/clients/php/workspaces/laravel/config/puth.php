<?php

return [
    'instance' => [
        'url' => env('PUTH_INSTANCE_URL', 'http://127.0.0.1:7345'),
    ],
    
    'debug' => env('PUTH_DEBUG', false),
    
    // Local fixture origins of the browser tests (dev/fixtures/server.mjs)
    'fixture' => rtrim(env('PUTH_FIXTURE_URL', 'http://127.0.0.1:8081'), '/').'/',

    'alt' => rtrim(env('PUTH_FIXTURE_ALT_URL', 'http://localhost:8082'), '/').'/',
];
