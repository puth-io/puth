<?php

namespace Puth\Traits;

use Puth\Context;
//use Puth\Objects\Browser;
//use Puth\Objects\Page;
use Symfony\Component\Process\Process;

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
     * The Puth process instance.
     *
     * https://symfony.com/doc/current/components/process.html
     *
     * @var Process
     */
    protected static Process $puthProcess;

    /**
     * The Puth instance port.
     *
     * @var int
     */
    protected static int $puthPort = 7345;

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
     * Prepare for Puth test execution.
     *
     * @return void
     * @throws \Exception
     */
    public static function setUpBeforeClass(): void
    {
        parent::setUpBeforeClass();

        if (method_exists(__CLASS__, 'shouldCreatePuthProcess') && static::shouldCreatePuthProcess()) {
            static::startPuthProcess();
        }
    }

    /**
     * Sets up a Context, Browser and Page for every test.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->context = new Context($this->getPuthInstanceUrl(), [
            'snapshot' => $this->isSnapshot(),
            'test' => [
                'name' => $this->getName(),
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
                'headless' => $this->shouldStartInHeadlessMode(),
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

        if (!$this->isDev()) {
            $this->page->close();
        }

        $destroyOptions = [];

        if ($this->hasFailed()) {
            $this->context->testFailed();

            if ($this->shouldSaveSnapshotOnFailure()) {
                $destroyOptions['save'] = ['to' => 'file'];
            }
        }
    
        $this->context->destroy(['options' => $destroyOptions]);
    }

    public static function tearDownAfterClass(): void
    {
        parent::tearDownAfterClass();

        if (isset(static::$puthProcess)) {
            static::$puthProcess->stop();
        }
    }

    public static function startPuthProcess()
    {
        static::$puthProcess = new Process(
            ['puth', 'start', '-p', static::getPuthPort()]
        );
        static::$puthProcess->start();

        static::$puthProcess->waitUntil(function ($type, $output) {
            return str_contains($output, '[Puth][Server] Api on');
        });

        if (static::$puthProcess->isTerminated()) {
            $error = static::$puthProcess->getErrorOutput();
            $exitCode = static::$puthProcess->getExitCode();

            throw new \RuntimeException("Puth could not be started. Command exited with code {$exitCode}: {$error}");
        }
    }

    public static function getPuthPort()
    {
        if (!isset(static::$puthPort)) {
            static::$puthPort = random_int(10000, 20000);
        }

        return static::$puthPort;
    }

    public function getPuthInstanceUrl(): string
    {
        return 'http://127.0.0.1:' . static::getPuthPort();
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

    public function shouldSaveSnapshotOnFailure()
    {
        return $this->saveSnapshotOnFailure ?? false;
    }
}
