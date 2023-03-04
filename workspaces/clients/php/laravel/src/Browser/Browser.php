<?php

namespace Puth\Laravel\Browser;

use Closure;
use BadMethodCallException;
use Illuminate\Support\Str;
use Illuminate\Support\Traits\Macroable;

class Browser
{
    use Concerns\InteractsWithAuthentication;
    use Concerns\InteractsWithCookies;
    use Concerns\InteractsWithElements;
    use Concerns\InteractsWithJavascript;
    use Concerns\InteractsWithMouse;
    use Concerns\MakesAssertions;
    use Concerns\MakesUrlAssertions;
    use Concerns\WaitsForElements;
    
    use Macroable {
        Macroable::__call as macroCall;
    }
    
    public $context;
    
    public $browser;
    
    /**
     * @var CDPPage|Frame
     */
    public $site;
    
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
    
    public $legacyBrowserHandling = true;
    
    public function __construct($context, $browser, $site, $resolver = null, $options = [])
    {
        $this->context = $context;
        $this->browser = $browser;
        $this->site = $site;
        
        $this->resolver = $resolver ?: new ElementResolver($this->site);
        
        $this->legacyBrowserHandling = $options['legacyBrowserHandling'] ?? false;
    }
    
    /**
     * Browse to the given URL.
     *
     * @param string|Page $url
     * @return $this
     */
    public function visit($url)
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
        
        $this->site->visit($url);
        
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
     * Browse to the "about:blank" page.
     *
     * @return $this
     */
    public function blank()
    {
        $this->site->visit('about:blank');
        
        return $this;
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
        
        return $this;
    }
    
    /**
     * Refresh the page.
     *
     * @return $this
     */
    public function refresh($options = [])
    {
        $this->site->reload($options);
        
        return $this;
    }
    
    /**
     * Navigate to the previous page.
     *
     * @return $this
     */
    public function back($options = [])
    {
        $this->site->goBack($options);
        
        return $this;
    }
    
    /**
     * Navigate to the next page.
     *
     * @return $this
     */
    public function forward($options = [])
    {
        $this->site->goForward($options);
        
        return $this;
    }

    /**
     * Resize the browser window.
     *
     * @param int $width
     * @param int $height
     * @return $this
     */
    public function resize($width, $height)
    {
        $this->site->setViewport([
            'width' => $width,
            'height' => $height,
        ]);
        
        return $this;
    }

    /**
     * Make the browser window as large as the content.
     *
     * @return $this
     */
    public function fitContent()
    {
        $html = $this->site->get('html');
        
        $boundingBox = (array) $html->boundingBox();
        
        $scrollSizes = [
            'width' => $html->scrollWidth,
            'height' => $html->scrollHeight,
        ];
        
        $this->resize(
            $boundingBox['width'] > $scrollSizes['width'] ? $boundingBox['width'] : $scrollSizes['width'],
            $boundingBox['height'] > $scrollSizes['height'] ? $boundingBox['height'] : $scrollSizes['height'],
        );
        
        return $this;
    }
    
    /**
     * Disable fit on failures.
     *
     * @return $this
     */
    public function disableFitOnFailure()
    {
        $this->fitOnFailure = false;
        
        return $this;
    }
    
    /**
     * Enable fit on failures.
     *
     * @return $this
     */
    public function enableFitOnFailure()
    {
        $this->fitOnFailure = true;
        
        return $this;
    }

    /**
     * Scroll element into view at the given selector.
     *
     * @param string $selector
     * @return $this
     */
    public function scrollIntoView($selector)
    {
        $this->resolver->findOrFail($selector)->scrollIntoView();
        
        return $this;
    }
    
    /**
     * Scroll screen to element at the given selector.
     *
     * @param string $selector
     * @return $this
     */
    public function scrollTo($selector)
    {
        return $this->scrollIntoView($selector);
    }
    
    /**
     * Take a screenshot and store it with the given name.
     *
     * @param string $name
     * @return $this
     */
    public function screenshot($name, $options = [])
    {
        $filePath = sprintf('%s/%s.png', rtrim(static::$storeScreenshotsAt, '/'), $name);
        
        $directoryPath = dirname($filePath);
        
        if (!is_dir($directoryPath)) {
            mkdir($directoryPath, 0777, true);
        }
        
        file_put_contents(
            $filePath,
            $this->site->screenshot($options),
        );
        
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

//    TODO implement
//
//    /**
//     * Store the console output with the given name.
//     *
//     * @param  string  $name
//     * @return $this
//     */
//    public function storeConsoleLog($name)
//    {
//        if (in_array($this->driver->getCapabilities()->getBrowserName(), static::$supportsRemoteLogs)) {
//            $console = $this->driver->manage()->getLog('browser');
//            
//            if (! empty($console)) {
//                file_put_contents(
//                    sprintf('%s/%s.log', rtrim(static::$storeConsoleLogAt, '/'), $name), json_encode($console, JSON_PRETTY_PRINT)
//                );
//            }
//        }
//        
//        return $this;
//    }
    
    /**
     * Store a snapshot of the page's current source code with the given name.
     *
     * @param string $name
     * @return $this
     */
    public function storeSource($name)
    {
        $source = $this->site->content();
        
        if (!empty($source)) {
            file_put_contents(
                sprintf('%s/%s.txt', rtrim(static::$storeSourceAt, '/'), $name), $source
            );
        }
        
        return $this;
    }

//    /**
//     * Switch to a specified frame in the browser and execute the given callback.
//     *
//     * @param  string  $selector
//     * @param  \Closure  $callback
//     * @return $this
//     */
//    public function withinFrame($selector, Closure $callback)
//    {
//        $this->driver->switchTo()->frame($this->resolver->findOrFail($selector));
//        
//        $callback($this);
//        
//        $this->driver->switchTo()->defaultContent();
//        
//        return $this;
//    }
//    
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
        $browser = new static(
            $this->context,
            $this->browser,
            $this->site,
            new ElementResolver(
                $this->site,
                $this->resolver->format($selector),
            ),
        );
        
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
        $browser = new static(
            $this->context,
            $this->browser,
            $this->site,
            new ElementResolver(
                $this->site,
                $selector,
            ),
        );
        
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
        return $this->elsewhere('', function ($browser) use ($selector, $callback, $seconds) {
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
     * Close the browser.
     *
     * @return void
     */
    public function quit()
    {
//        if ($this->site->getRepresents() === 'CDPPage') {
//            $this->site->close();
//        }
        $this->context->destroyBrowserByBrowser($this->browser);
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
        dd($this->site->content());
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
            'puthBrowser' => $this->browser,
            'site' => $this->site,
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