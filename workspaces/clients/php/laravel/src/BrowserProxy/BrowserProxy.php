<?php

namespace Puth\Laravel\BrowserProxy;

use Illuminate\Support\Str;

class BrowserProxy
{
    use Concerns\InteractsWithAuthentication;
    use Concerns\InteractsWithCookies;
    use Concerns\InteractsWithElements;
    use Concerns\InteractsWithJavascript;
    use Concerns\InteractsWithMouse;
    use Concerns\MakesAssertions;
    use Concerns\MakesUrlAssertions;
    use Concerns\WaitsForElements;

//    use Macroable {
//        Macroable::__call as macroCall;
//    }
    
    private $puthBrowser;
    
    private $puthPage;
    
    /**
     * The base URL for all URLs.
     *
     * @var string
     */
    public static $baseUrl;
    
    /**
     * The page object currently being viewed.
     *
     * @var mixed
     */
    public $page;
    
    public function __construct($browser)
    {
        $this->puthBrowser = $browser;
        $this->puthPage = $this->puthBrowser->pages()[0];
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
        
        $this->puthPage->visit($url);
        
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
     * @param  string  $route
     * @param  array  $parameters
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
        $this->puthPage->visit('about:blank');
        
        return $this;
    }
    
    /**
     * Set the current page object.
     *
     * @param  mixed  $page
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
     * @param  mixed  $page
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
    
//    /**
//     * Dynamically call a method on the browser.
//     *
//     * @param  string  $method
//     * @param  array  $parameters
//     * @return mixed
//     *
//     * @throws BadMethodCallException
//     */
//    public function __call($method, $parameters)
//    {
//        if (static::hasMacro($method)) {
//            return $this->macroCall($method, $parameters);
//        }
//        
//        if ($this->component && method_exists($this->component, $method)) {
//            array_unshift($parameters, $this);
//            
//            $this->component->{$method}(...$parameters);
//            
//            return $this;
//        }
//        
//        if ($this->page && method_exists($this->page, $method)) {
//            array_unshift($parameters, $this);
//            
//            $this->page->{$method}(...$parameters);
//            
//            return $this;
//        }
//        
//        throw new BadMethodCallException("Call to undefined method [{$method}].");
//    }
}