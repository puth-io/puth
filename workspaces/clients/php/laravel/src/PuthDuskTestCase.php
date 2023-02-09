<?php

namespace Puth\Laravel;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Puth\Context;
use Puth\Laravel\Facades\Puth;
use Puth\Laravel\Traits\PuthDuskBrowser;
use Puth\Traits\PuthAssertions;
use Puth\Traits\PuthDuskAssertions;
use Puth\Traits\PuthDuskUrlAssertions;
use Tests\CreatesApplication;

abstract class PuthDuskTestCase extends BaseTestCase
{
    use CreatesApplication;
    use PuthAssertions;
    use PuthDuskAssertions;
    use PuthDuskUrlAssertions;
    use PuthDuskBrowser;
    
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
}