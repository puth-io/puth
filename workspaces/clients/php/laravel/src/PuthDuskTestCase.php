<?php

namespace Puth\Laravel;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Puth\Context;
use Puth\Laravel\Browser\Browser;
use Puth\Laravel\Browser\Concerns\ProvidesBrowser;
use Puth\Laravel\Facades\Puth;
use Puth\Traits\PuthAssertions;
use Puth\Traits\PuthDuskAssertions;
use Puth\Traits\PuthDuskUrlAssertions;
use Tests\CreatesApplication;

abstract class PuthDuskTestCase extends BaseTestCase
{
    use ProvidesBrowser;
    use CreatesApplication;
    use PuthAssertions;
    use PuthDuskAssertions;
    use PuthDuskUrlAssertions;
    
    public Context $context;
    
    protected function setUp(): void
    {
        parent::setUp();
    
        $this->context = new Context(Puth::instanceUrl(), [
            'snapshot' => true,
            'test' => [
                'name' => $this->getName(),
            ],
            'group' => get_class($this),
            'dev' => false,
            'debug' => false,
            'timeouts' => [
                'command' => 5000,
            ],
        ]);
        
        if ($this->shouldTrackLog()) {
            Puth::captureLog();
        }
    
        Browser::$baseUrl = $this->baseUrl();
    
//        Browser::$storeScreenshotsAt = base_path('tests/Browser/screenshots');
//    
//        Browser::$storeConsoleLogAt = base_path('tests/Browser/console');
//    
//        Browser::$storeSourceAt = base_path('tests/Browser/source');
    }
    
    protected function tearDown(): void
    {
        Puth::releaseLog();
    
        $destroyOptions = [];

        if ($this->hasFailed()) {
            $this->context->testFailed();
    
            if ($this->shouldSaveSnapshotOnFailure()) {
                $destroyOptions['save'] = ['to' => 'file'];
            }
        }
        
        static::closeAll();
    
        foreach (static::$afterClassCallbacks as $callback) {
            $callback();
        }
    
        $this->context->destroy(['options' => $destroyOptions]);
    
        parent::tearDown();
    }
    
    public function shouldTrackLog(): bool
    {
        return true;
    }
    
    public function shouldSaveSnapshotOnFailure()
    {
        return $this->saveSnapshotOnFailure ?? false;
    }
    
    /**
     * Determine the application's base URL.
     *
     * @return string
     */
    protected function baseUrl()
    {
        return rtrim(config('app.url'), '/');
    }
}