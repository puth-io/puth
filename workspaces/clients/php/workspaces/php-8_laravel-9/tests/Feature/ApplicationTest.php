<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Log;
use Puth\Laravel\Facades\Puth;
use Puth\Laravel\TestCase;

class ApplicationTest extends TestCase
{
    function test_visit_playground()
    {
        $this->visit('https://playground.puth.dev');
        
        Log::info('test', [$this]);
        
        dump(json_encode(Puth::getFormattedLog()));
        dump(Puth::clearLog());
        dump(Puth::getFormattedLog());
    }
}