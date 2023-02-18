<?php

namespace Puth\Laravel;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Puth\Laravel\Facades\Puth;
use Puth\Traits\PuthAssertions;
use Puth\Traits\PuthTestCaseTrait;
use Tests\CreatesApplication;

abstract class PuthTestCase extends BaseTestCase
{
    use CreatesApplication;
    use PuthAssertions;
    
    use PuthTestCaseTrait {
        PuthTestCaseTrait::setUp as protected setUpPuth;
        PuthTestCaseTrait::tearDown as protected tearDownPuth;
    }
    
    protected function setUp(): void
    {
        $this->setUpPuth();
        
        if ($this->shouldTrackLog()) {
            Puth::captureLog();
        }
        
    }
    
    protected function tearDown(): void
    {
        Puth::releaseLog();
        
        $this->tearDownPuth();
    }
    
    function visit($url)
    {
        $urlParsed = parse_url($url);
        
        if (!array_key_exists('scheme', $urlParsed)) {
            $url = ltrim(rtrim(url('/'), '/') . '/' . ltrim($url, '/'), '/');
        }
        
        $this->page?->goto($url);
    }
    
    public function shouldTrackLog(): bool
    {
        return true;
    }
    
    public function getPuthInstanceUrl(): string
    {
        return Puth::instanceUrl();
    }
    
    protected function shouldSnapshot(): bool
    {
        return true;
    }
    
    public static function shouldCreatePuthProcess(): bool
    {
        return false;
    }
}