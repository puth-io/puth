<?php

namespace Puth\Laravel;

use JetBrains\PhpStorm\ExpectedValues;
use Closure;
use BadMethodCallException;
use Illuminate\Support\Str;
use Illuminate\Support\Traits\Macroable;

class Browser extends \Puth\RemoteObjects\Browser
{
    use Concerns\InteractsWithAuthentication; // done
    use Concerns\InteractsWithCookies; // done
    use Concerns\InteractsWithElements; // done
    use Concerns\InteractsWithKeyboard; // done - we can't really rewrite the keyboard in puth since
//    use Concerns\InteractsWithMouse; // done (deleted)
    use Concerns\MakesAssertions; // done
    use Concerns\WaitsForElements;

    use Macroable {
        Macroable::__call as macroCall;
    }

    /**
     * The base URL for all URLs.
     *
     * @var string
     */
    public static $baseUrl;

    /**
     * The directory that will contain any screenshots.
     *
     * @var string
     */
    public static $storeScreenshotsAt;

    /**
     * The common screen sizes to use for responsive screenshots.
     *
     * @var array
     */
    public static $responsiveScreenSizes = [
        'xs' => [
            'width' => 360,
            'height' => 640,
        ],
        'sm' => [
            'width' => 640,
            'height' => 360,
        ],
        'md' => [
            'width' => 768,
            'height' => 1024,
        ],
        'lg' => [
            'width' => 1024,
            'height' => 768,
        ],
        'xl' => [
            'width' => 1280,
            'height' => 1024,
        ],
        '2xl' => [
            'width' => 1536,
            'height' => 864,
        ],
    ];

    /**
     * The directory that will contain any console logs.
     *
     * @var string
     */
    public static $storeConsoleLogAt;

    /**
     * The directory where source code snapshots will be stored.
     *
     * @var string
     */
    public static $storeSourceAt;

    /**
     * Get the callback which resolves the default user to authenticate.
     *
     * @var \Closure
     */
    public static $userResolver;

    /**
     * The default wait time in seconds.
     *
     * @var int
     */
    public static $waitSeconds = 5;

    /**
     * The element resolver instance.
     *
     * @var ElementResolver
     */
    public $resolver;

    /**
     * The page object currently being viewed.
     *
     * @var mixed
     */
    public $page;

    /**
     * The component object currently being viewed.
     *
     * @var mixed
     */
    public $component;

    /**
     * Indicates that the browser should be resized to fit the entire "body" before screenshotting failures.
     *
     * @var bool
     */
    public $fitOnFailure = true;

    public function __construct(\Puth\RemoteObjects\Browser $remote, $resolver = null, $options = [])
    {
        parent::__construct($remote->id, $remote->type, $remote->represents, $remote->parent, $remote->context);

        $this->setResolver($resolver ?? new ElementResolver($this));
    }

    public function getResolver(): ElementResolver
    {
        return $this->resolver;
    }

    public function setResolver(ElementResolver $resolver): void
    {
        $this->resolver = $resolver;

        if (($prefix = $this->resolver->format('')) !== 'body') {
            $this->setResolverPrefix($prefix);
        }
    }

    /**
     * Browse to the given URL.
     *
     * @param string|Page $url
     * @return $this
     */
    public function visit(string|Page $url): \Puth\RemoteObjects\Browser
    {
        // First, if the URL is an object it means we are actually dealing with a page
        // and we need to create this page then get the URL from the page object as
        // it contains the URL. Once that is done, we will be ready to format it.
        if (is_object($url)) {
            $page = $url;

            $url = $page->url();
        }

        // If the URL does not start with http or https, then we will prepend the base
        // URL onto the URL and navigate to the URL. This will actually navigate to
        // the URL in the browser. Then we will be ready to make assertions, etc.
        if (!Str::startsWith($url, ['http://', 'https://'])) {
            $url = static::$baseUrl . '/' . ltrim($url, '/');
        }

        parent::visit($url);

        // If the page variable was set, we will call the "on" method which will set a
        // page instance variable and call an assert method on the page so that the
        // page can have the chance to verify that we are within the right pages.
        if (isset($page)) {
            $this->on($page);
        }

        return $this;
    }

    /**
     * Browse to the given route.
     *
     * @param string $route
     * @param array $parameters
     * @return $this
     */
    public function visitRoute($route, $parameters = [])
    {
        return $this->visit(route($route, $parameters));
    }

    /**
     * Set the current page object.
     *
     * @param mixed $page
     * @return $this
     */
    public function on($page)
    {
        $this->onWithoutAssert($page);

        $page->assert($this);

        return $this;
    }

    /**
     * Set the current page object without executing the assertions.
     *
     * @param mixed $page
     * @return $this
     */
    public function onWithoutAssert($page)
    {
        $this->page = $page;

        // Here we will set the page elements on the resolver instance, which will allow
        // the developer to access short-cuts for CSS selectors on the page which can
        // allow for more expressive navigation and interaction with all the pages.
        $this->resolver->pageElements(array_merge(
            $page::siteElements(), $page->elements()
        ));
        $this->setResolverPageElements($this->resolver->elements);

        return $this;
    }

    /**
     * Accumulates calls and executes them together.
     *
     * Problem:
     * - single methods making multiple calls would hang on the first call
     *
     * Solution:
     * - temporarily disabled accumulation on basic calls like get()
     * - opt in certain methods (most likely ones that 'act') for accumulation (waitForSelector, click, ...)
     *
     * @internal
     * @param Closure $closure
     * @param Closure|null $callback
     * @return $this
     */
    public function all(Closure $closure, Closure $callback = null)
    {
        return $this->multiple('all', $closure, $callback);
    }

    /**
     * Accumulates calls and executes them together.
     *
     * Problem:
     * - single methods making multiple calls would hang on the first call
     *
     * Solution:
     * - temporarily disabled accumulation on basic calls like get()
     * - opt in certain methods (most likely ones that 'act') for accumulation (waitForSelector, click, ...)
     *
     * @internal
     * @param Closure $closure
     * @param Closure|null $callback
     * @return $this
     */
    public function any(Closure $closure, Closure $callback = null)
    {
        return $this->multiple('any', $closure, $callback);
    }

    /**
     * Accumulates calls and executes them together.
     *
     * Problem:
     * - single methods making multiple calls would hang on the first call
     *
     * Solution:
     * - temporarily disabled accumulation on basic calls like get()
     * - opt in certain methods (most likely ones that 'act') for accumulation (waitForSelector, click, ...)
     *
     * @internal
     * @param Closure $closure
     * @param Closure|null $callback
     * @return $this
     */
    public function race(Closure $closure, Closure $callback = null)
    {
        return $this->multiple('race', $closure, $callback);
    }

    private function multiple(
        #[ExpectedValues(['all', 'any', 'race'])] $type,
        Closure $closure,
        Closure $callback = null
    )
    {
        $this->context->startAccumulatingCalls();

        $closure($this->site); // TODO fix?

        $this->context->stopAccumulatingCalls();

        // send all captured calls at once
        $result = $this->context->sendAccumulatedCalls($type);

        if ($callback) {
            $callback(...$result);
        }

        return $this;
    }

    /**
     * Take a screenshot and store it with the given name.
     *
     * @param string $name
     * @return $this
     */
    public function screenshot($name, $options = []): mixed
    {
        $filePath = sprintf('%s/%s.png', rtrim(static::$storeScreenshotsAt, '/'), $name);

        $directoryPath = dirname($filePath);

        if (!is_dir($directoryPath)) {
            mkdir($directoryPath, 0777, true);
        }

        try {
            file_put_contents(
                $filePath,
                $this->_screenshot($options),
            );
        } catch (\Exception) {
        }

        return $this;
    }

    /**
     * Take a series of screenshots at different browser sizes to emulate different devices.
     *
     * @param string $name
     * @return $this
     */
    public function responsiveScreenshots($name)
    {
        if (substr($name, -1) !== '/') {
            $name .= '-';
        }

        foreach (static::$responsiveScreenSizes as $device => $size) {
            $this->resize($size['width'], $size['height'])
                ->screenshot("$name$device");
        }

        return $this;
    }

    /**
     * Store the console output with the given name.
     *
     * @param string $name
     * @return $this
     */
    public function storeConsoleLog($name)
    {
        $console = $this->context->getSnapshotsByType('log');

        if (!empty($console)) {
            file_put_contents(
                sprintf('%s/%s.log', rtrim(static::$storeConsoleLogAt, '/'), $name), json_encode($console, JSON_PRETTY_PRINT)
            );
        }

        return $this;
    }

    /**
     * Store a snapshot of the page's current source code with the given name.
     *
     * @param string $name
     * @return $this
     */
    public function storeSource($name)
    {
        try {
            $source = $this->content();

            if (!empty($source)) {
                file_put_contents(
                    sprintf('%s/%s.txt', rtrim(static::$storeSourceAt, '/'), $name), $source
                );
            }
        } catch (\Throwable) {}

        return $this;
    }

    /**
     * Switch to a specified frame in the browser and execute the given callback.
     *
     * @param  string  $selector
     * @param  \Closure  $callback
     * @return $this
     */
    public function withinFrame($selector, Closure $callback)
    {
        $browser = new static(
            $this->_withinIframe($selector),
            $this->resolver,
        );

        $callback($browser);

        return $this;
    }

    /**
     * Execute a Closure with a scoped browser instance.
     *
     * @param  \Closure  $callback
     * @return $this
     */
    public function within($selector, Closure $callback)
    {
        return $this->with($selector, $callback);
    }

    /**
     * Execute a Closure with a scoped browser instance.
     *
     * @param \Closure $callback
     * @return $this
     */
    public function with($selector, Closure $callback)
    {
        $browser = new static($this->clone());
        $browser->setResolver(new ElementResolver(
            $browser,
            $this->resolver->format($selector),
        ));

        if ($this->page) {
            $browser->onWithoutAssert($this->page);
        }
        if ($selector instanceof Component) {
            $browser->onComponent($selector, $this->resolver);
        }

        call_user_func($callback, $browser);

        return $this;
    }

    /**
     * Execute a Closure outside of the current browser scope.
     *
     * @param  \Closure  $callback
     * @return $this
     */
    public function elsewhere($selector, Closure $callback)
    {
        $browser = new static($this->clone());
        $browser->setResolver(new ElementResolver(
            $browser,
            'body ' . $selector,
        ));

        if ($this->page) {
            $browser->onWithoutAssert($this->page);
        }
        if ($selector instanceof Component) {
            $browser->onComponent($selector, $this->resolver);
        }

        call_user_func($callback, $browser);

        return $this;
    }

    /**
     * Execute a Closure outside of the current browser scope when the selector is available.
     *
     * @param  string  $selector
     * @param  \Closure  $callback
     * @param  int|null  $seconds
     * @return $this
     */
    public function elsewhereWhenAvailable($selector, Closure $callback, $seconds = null)
    {
        return $this->elsewhere('', function (Browser $browser) use ($selector, $callback, $seconds) {
            $browser->whenAvailable($selector, $callback, $seconds);
        });
    }

    /**
     * Set the current component state.
     *
     * @param Component $component
     * @param ElementResolver $parentResolver
     * @return void
     */
    public function onComponent($component, $parentResolver)
    {
        $this->component = $component;

        // Here we will set the component elements on the resolver instance, which will allow
        // the developer to access short-cuts for CSS selectors on the component which can
        // allow for more expressive navigation and interaction with all the components.
        $this->resolver->pageElements(
            $component->elements() + $parentResolver->elements
        );

        $component->assert($this);

        $this->resolver->prefix = $this->resolver->format(
            $component->selector()
        );
    }

    /**
     * Assert that the current URL path matches the given route.
     *
     * @param string $route
     * @param array $parameters
     */
    public function assertRouteIs($route, $parameters = []): static
    {
        return $this->assertPathIs(route($route, $parameters, false));
    }

    /**
     * Ensure that jQuery is available on the page.
     *
     * @return void
     */
    public function ensurejQueryIsAvailable()
    {
        if ($this->evaluate('window.jQuery == null')) {
            $this->evaluate(file_get_contents(__DIR__.'/../misc/jquery.js'));
        }
    }

    /**
     * Pause for the given amount of milliseconds.
     *
     * @param int $milliseconds
     * @return $this
     */
    public function pause($milliseconds)
    {
        usleep($milliseconds * 1000);

        return $this;
    }

    /**
     * Pause for the given amount of milliseconds if the given condition is true.
     *
     * @param bool $boolean
     * @param int $milliseconds
     * @return $this
     */
    public function pauseIf($boolean, $milliseconds)
    {
        if ($boolean) {
            return $this->pause($milliseconds);
        }

        return $this;
    }

    /**
     * Pause for the given amount of milliseconds unless the given condition is true.
     *
     * @param bool $boolean
     * @param int $milliseconds
     * @return $this
     */
    public function pauseUnless($boolean, $milliseconds)
    {
        if (!$boolean) {
            return $this->pause($milliseconds);
        }

        return $this;
    }

    /**
     * Tap the browser into a callback.
     *
     * @param \Closure $callback
     * @return $this
     */
    public function tap($callback)
    {
        $callback($this);

        return $this;
    }

    /**
     * Dump the content from the last response.
     *
     * @return void
     */
    public function dump()
    {
        dd($this->content());
    }

    /**
     * Pause execution of test and open Laravel Tinker (PsySH) REPL.
     *
     * @return $this
     */
    public function tinker()
    {
        \Psy\Shell::debug([
            'browser' => $this,
            'resolver' => $this->resolver,
            'page' => $this->page,
            'context' => $this->context,
        ], $this);

        return $this;
    }

    /**
     * Stop running tests but leave the browser open.
     *
     * @return void
     */
    public function stop()
    {
        exit();
    }

    /**
     * Dynamically call a method on the browser.
     *
     * @param string $method
     * @param array $parameters
     * @return mixed
     *
     * @throws BadMethodCallException
     */
    public function __call($method, $parameters)
    {
        if (static::hasMacro($method)) {
            return $this->macroCall($method, $parameters);
        }

        if ($this->component && method_exists($this->component, $method)) {
            array_unshift($parameters, $this);

            $this->component->{$method}(...$parameters);

            return $this;
        }

        if ($this->page && method_exists($this->page, $method)) {
            array_unshift($parameters, $this);

            $this->page->{$method}(...$parameters);

            return $this;
        }

        throw new BadMethodCallException("Call to undefined method [{$method}].");
    }
}
