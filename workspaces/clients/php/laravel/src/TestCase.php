<?php

namespace Puth\Laravel;

use Exception;
use Illuminate\Foundation\Testing\TestCase as FoundationTestCase;
use PHPUnit\Runner\Version;
use Puth\Context;
use Puth\Laravel\Browser\Browser;
use Puth\Laravel\Browser\Concerns\ProvidesBrowser;
use Puth\Laravel\Facades\Puth;
use Puth\Traits\PuthAssertions;
use Puth\Utils\BackTrace;

abstract class TestCase extends FoundationTestCase
{
    use ProvidesBrowser;
    use PuthAssertions;
    
    public Context $context;
    
    public static bool $debug = false;
    
    protected function setUp(): void
    {
        parent::setUp();
        
        static::$debug = config('puth.debug', false);
    
        $this->context = new Context(Puth::instanceUrl(), array_merge([
            'test' => [
                'name' => $this->getPhpunitTestName(),
                'group' => get_class($this),
            ],
            'snapshot' => true,
            'debug' => static::$debug,
        ], $this->getContextOptions()));
        
        Browser::$baseUrl = $this->baseUrl();
        Browser::$storeScreenshotsAt = base_path('tests/Browser/screenshots');
        Browser::$storeConsoleLogAt = base_path('tests/Browser/console');
        Browser::$storeSourceAt = base_path('tests/Browser/source');
        Browser::$userResolver = function () {
            return $this->user();
        };
        
        BackTrace::$debug = static::$debug;
    
        if ($this->shouldTrackLog()) {
            Puth::captureLog();
        }
    }
    
    public function getContextOptions(): array
    {
        return [];
    }
    
    protected function tearDown(): void
    {
        Puth::releaseLog();
        Puth::clearLog();
    
        $destroyOptions = [];

        if ($this->hasPhpunitTestFailed()) {
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
        if (isset($this->saveSnapshotOnFailure)) {
            return $this->saveSnapshotOnFailure;
        }
        
        $ci = env('CI');
        if ($ci === true || $ci === '1' || $ci === 'true') {
            return true;
        }
        
        return false;
    }
    
    private function isPhpVersion10()
    {
        return intval(explode('.', Version::id())[0]) > 9;
    }
    
    public function getPhpunitTestName()
    {
        return $this->isPhpVersion10() ? $this->name() : $this->getName();
    }
    
    public function hasPhpunitTestFailed()
    {
        if (!$this->isPhpVersion10()) {
            return $this->hasFailed();
        }
        
        return $this->status()->isFailure() || $this->status()->isError();
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
    
    /**
     * Return the default user to authenticate.
     *
     * @throws \Exception
     */
    protected function user()
    {
        throw new Exception('User resolver has not been set.');
    }
}
