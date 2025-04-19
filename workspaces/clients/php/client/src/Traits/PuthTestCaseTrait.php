<?php

namespace Puth\Traits;

use PHPUnit\Runner\Version;
use Puth\Context;

/**
 * PuthTestCaseTrait
 *
 * @property boolean $snapshot Enable snapshotting. You can use snapshots to view/review the test live in the GUI.
 * @property boolean $dev Enable if you are locally writing tests.
 * @property boolean $debug Enables debug output on client and server side
 * @property boolean $headless Override headless browser setting.
 * @property boolean $baseUrl Shorthand variable for navigation to a default url.
 * @property array $cookies Array of cookies to be set on setUp().
 */
trait PuthTestCaseTrait
{
    public Context $context;
    public $browser;
    public $page;

    /**
     * Set to connect to custom browser ws endpoint instead of the puth server creating a new one.
     *
     * @var string
     */
    protected string $browserWSEndpoint = '';

    /**
     * Default viewport.
     *
     * @var array|int[]
     */
    protected array $defaultViewport = [
        'width' => 1280,
        'height' => 720,
        // 'deviceScaleFactor' => 1,
    ];
    
    /**
     * Sets up a Context, Browser and Page for every test.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->context = new Context($this->getPuthInstanceUrl(), [
            'snapshot' => $this->isSnapshot(),
            'test' => [
                'name' => $this->getPhpunitTestName(),
                'group' => get_class($this),
            ],
            'group' => get_class($this),
            'dev' => $this->isDev(),
            'debug' => $this->isDebug(),
            'timeouts' => [
                'command' => $this->getTimeout(),
            ],
        ]);

        // If specific browser ws endpoint is set, always connect to that
        if ($this->hasSpecificBrowserWSEndpoint()) {
            $this->browser = $this->context->connectBrowser([
                'browserWSEndpoint' => $this->browserWSEndpoint,
                'defaultViewport' => $this->defaultViewport,
            ]);
        } else {
            $this->browser = $this->context->createBrowser([
                'headless' => $this->shouldStartInHeadlessMode() ? 'new' : false,
                'defaultViewport' => $this->defaultViewport,
                // 'args' => [
                //     '--window-size=' . $this->defaultViewport['width'] . ',' . $this->defaultViewport['height'],
                // ],
            ]);
        }

        // Get the default page of the browser
        $this->page = $this->browser->pages()[0];

        // Set prefers-reduced-motion to reduce because click has problems to wait for scroll
        // animation if 'scroll-behavior: smooth' is set.
        // TODO set by default inside Puth server
        $this->page->emulateMediaFeatures([[
            'name' => 'prefers-reduced-motion',
            'value' => 'reduce',
        ]]);

        // Set default cookies if defined
        if (isset($this->cookies)) {
            $this->page->setCookie(...$this->cookies);
        }

        if ($baseUrl = $this->getBaseUrl()) {
            $this->page->goto($baseUrl);
        }
    }

    /**
     * Closes Browser and destroys the Context.
     */
    protected function tearDown(): void
    {
        parent::tearDown();

        $destroyOptions = [];

        if ($this->hasPhpunitTestFailed()) {
            $this->context->testFailed();
    
            if ($this->shouldSaveSnapshotOnFailure()) {
                $destroyOptions['save'] = ['to' => 'file'];
            }
        }
    
        $this->context->destroy(['options' => $destroyOptions]);
    }

    public function getPuthInstanceUrl(): string
    {
        return 'http://127.0.0.1:7345';
    }

    public function getBaseUrl(): ?string
    {
        return $this->baseUrl ?? null;
    }

    public function isSnapshot(): bool
    {
        return $this->snapshot ?? true;
    }

    public function isDev(): bool
    {
        return $this->dev ?? false;
    }

    public function getTimeout(): int
    {
        return $this->timeout ?? 10 * 1000;
    }

    public function isDebug(): bool
    {
        return $this->debug ?? false;
    }

    public function hasSpecificBrowserWSEndpoint(): bool
    {
        return !empty($this->browserWSEndpoint);
    }

    public function shouldStartInHeadlessMode(): bool
    {
        if (isset($this->headless)) {
            return $this->headless;
        }

        if ($this->isDev()) {
            return false;
        }

        return true;
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

    public function shouldSaveSnapshotOnFailure()
    {
        return $this->saveSnapshotOnFailure ?? false;
    }
}
