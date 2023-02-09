<?php

namespace Puth\Traits;

use PHPUnit\Framework\Assert;
use PHPUnit\Framework\Constraint\RegularExpression;

trait PuthDuskUrlAssertions
{
    use PuthUtils;

    /**
     * Assert that the current URL matches the given URL.
     *
     * @param string $url
     * @return $this
     */
    public function assertUrlIs($url)
    {
        $pattern = str_replace('\*', '.*', preg_quote($url, '/'));
        
        $segments = parse_url($this->page->url());
        
        $currentUrl = sprintf(
            '%s://%s%s%s',
            $segments['scheme'],
            $segments['host'],
            array_key_exists('port', $segments) ? ':' . $segments['port'] : '',
            array_key_exists('path', $segments) ? $segments['path'] : '',
        );
        
        Assert::assertThat(
            $currentUrl, new RegularExpression('/^' . $pattern . '$/u'),
            "Actual URL [{$this->page->url()}] does not equal expected URL [{$url}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the current scheme matches the given scheme.
     *
     * @param string $scheme
     * @return $this
     */
    public function assertSchemeIs($scheme)
    {
        $pattern = str_replace('\*', '.*', preg_quote($scheme, '/'));
        
        $actual = parse_url($this->page->url(), PHP_URL_SCHEME) ?? '';
        
        Assert::assertThat(
            $actual, new RegularExpression('/^' . $pattern . '$/u'),
            "Actual scheme [{$actual}] does not equal expected scheme [{$pattern}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the current scheme does not match the given scheme.
     *
     * @param string $scheme
     * @return $this
     */
    public function assertSchemeIsNot($scheme)
    {
        $actual = parse_url($this->page->url(), PHP_URL_SCHEME) ?? '';
        
        Assert::assertNotEquals(
            $scheme, $actual,
            "Scheme [{$scheme}] should not equal the actual value."
        );
        
        return $this;
    }
    
    /**
     * Assert that the current host matches the given host.
     *
     * @param string $host
     * @return $this
     */
    public function assertHostIs($host)
    {
        $pattern = str_replace('\*', '.*', preg_quote($host, '/'));
        
        $actual = parse_url($this->page->url(), PHP_URL_HOST) ?? '';
        
        Assert::assertThat(
            $actual, new RegularExpression('/^' . $pattern . '$/u'),
            "Actual host [{$actual}] does not equal expected host [{$pattern}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the current host does not match the given host.
     *
     * @param string $host
     * @return $this
     */
    public function assertHostIsNot($host)
    {
        $actual = parse_url($this->page->url(), PHP_URL_HOST) ?? '';
        
        Assert::assertNotEquals(
            $host, $actual,
            "Host [{$host}] should not equal the actual value."
        );
        
        return $this;
    }
    
    /**
     * Assert that the current port matches the given port.
     *
     * @param string $port
     * @return $this
     */
    public function assertPortIs($port)
    {
        $pattern = str_replace('\*', '.*', preg_quote($port, '/'));
        
        $actual = (string)parse_url($this->page->url(), PHP_URL_PORT) ?? '';

        if (empty($actual)) {
            $scheme = parse_url($this->page->url(), PHP_URL_SCHEME);

            if ($scheme === 'http') {
                $actual = '80';
            }
            if ($scheme === 'https') {
                $actual = '443';
            }
        }

        Assert::assertThat(
            $actual, new RegularExpression('/^' . $pattern . '$/u'),
            "Actual port [{$actual}] does not equal expected port [{$pattern}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the current host does not match the given host.
     *
     * @param string $port
     * @return $this
     */
    public function assertPortIsNot($port)
    {
        $actual = parse_url($this->page->url(), PHP_URL_PORT) ?? '';
        
        Assert::assertNotEquals(
            $port, $actual,
            "Port [{$port}] should not equal the actual value."
        );
        
        return $this;
    }
    
    /**
     * Assert that the current URL path matches the given pattern.
     *
     * @param string $path
     * @return $this
     */
    public function assertPathIs($path)
    {
        $pattern = str_replace('\*', '.*', preg_quote($path, '/'));
        
        $this->retryFunc(function () use ($path, $pattern) {
            $actualPath = parse_url($this->page->url(), PHP_URL_PATH) ?? '';

            Assert::assertThat(
                $actualPath, new RegularExpression('/^' . $pattern . '$/u'),
                "Actual path [{$actualPath}] does not equal expected path [{$path}]."
            );
        });
        
        return $this;
    }
    
    /**
     * Assert that the current URL path begins with given path.
     *
     * @param string $path
     * @return $this
     */
    public function assertPathBeginsWith($path)
    {
        $actualPath = parse_url($this->page->url(), PHP_URL_PATH) ?? '';
        
        Assert::assertStringStartsWith(
            $path, $actualPath,
            "Actual path [{$actualPath}] does not begin with expected path [{$path}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the current URL path does not match the given path.
     *
     * @param string $path
     * @return $this
     */
    public function assertPathIsNot($path)
    {
        $actualPath = parse_url($this->page->url(), PHP_URL_PATH) ?? '';
        
        Assert::assertNotEquals(
            $path, $actualPath,
            "Path [{$path}] should not equal the actual value."
        );
        
        return $this;
    }
    
    /**
     * Assert that the current URL fragment matches the given pattern.
     *
     * @param string $fragment
     * @return $this
     */
    public function assertFragmentIs($fragment)
    {
        $pattern = preg_quote($fragment, '/');

        $this->context->setCapability('EVAL', true);
        $actualFragment = (string)parse_url($this->page->evaluate('() => window.location.href'), PHP_URL_FRAGMENT);
        $this->context->setCapability('EVAL', false);

        Assert::assertThat(
            $actualFragment, new RegularExpression('/^' . str_replace('\*', '.*', $pattern) . '$/u'),
            "Actual fragment [{$actualFragment}] does not equal expected fragment [{$fragment}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the current URL fragment begins with given fragment.
     *
     * @param string $fragment
     * @return $this
     */
    public function assertFragmentBeginsWith($fragment)
    {
        $this->context->setCapability('EVAL', true);
        $actualFragment = (string)parse_url($this->page->evaluate('() => window.location.href'), PHP_URL_FRAGMENT);
        $this->context->setCapability('EVAL', false);
        
        Assert::assertStringStartsWith(
            $fragment, $actualFragment,
            "Actual fragment [$actualFragment] does not begin with expected fragment [$fragment]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the current URL fragment does not match the given fragment.
     *
     * @param string $fragment
     * @return $this
     */
    public function assertFragmentIsNot($fragment)
    {
        $this->context->setCapability('EVAL', true);
        $actualFragment = (string)parse_url($this->page->evaluate('() => window.location.href'), PHP_URL_FRAGMENT);
        $this->context->setCapability('EVAL', false);
        
        Assert::assertNotEquals(
            $fragment, $actualFragment,
            "Fragment [{$fragment}] should not equal the actual value."
        );
        
        return $this;
    }
    
    /**
     * Assert that the current URL path matches the given route.
     *
     * @param string $route
     * @param array $parameters
     * @return $this
     */
    public function assertRouteIs($route, $parameters = [])
    {
        return $this->assertPathIs(route($route, $parameters, false));
    }
    
    /**
     * Assert that a query string parameter is present and has a given value.
     *
     * @param string $name
     * @param string $value
     * @return $this
     */
    public function assertQueryStringHas($name, $value = null)
    {
        $output = $this->assertHasQueryStringParameter($name);
        
        if (is_null($value)) {
            return $this;
        }
        
        $parsedOutputName = is_array($output[$name]) ? implode(',', $output[$name]) : $output[$name];
        
        $parsedValue = is_array($value) ? implode(',', $value) : $value;
        
        Assert::assertEquals(
            $value, $output[$name],
            "Query string parameter [{$name}] had value [{$parsedOutputName}], but expected [{$parsedValue}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given query string parameter is missing.
     *
     * @param string $name
     * @return $this
     */
    public function assertQueryStringMissing($name)
    {
        $parsedUrl = parse_url($this->page->url());
        
        if (!array_key_exists('query', $parsedUrl)) {
            Assert::assertTrue(true);
            
            return $this;
        }
        
        parse_str($parsedUrl['query'], $output);
        
        Assert::assertArrayNotHasKey(
            $name, $output,
            "Found unexpected query string parameter [{$name}] in [" . $this->page->url() . '].'
        );
        
        return $this;
    }
    
    /**
     * Assert that the given query string parameter is present.
     *
     * @param string $name
     * @return array
     */
    protected function assertHasQueryStringParameter($name)
    {
        $parsedUrl = parse_url($this->page->url());
        
        Assert::assertArrayHasKey(
            'query', $parsedUrl,
            'Did not see expected query string in [' . $this->page->url() . '].'
        );
        
        parse_str($parsedUrl['query'], $output);
        
        Assert::assertArrayHasKey(
            $name, $output,
            "Did not see expected query string parameter [{$name}] in [" . $this->page->url() . '].'
        );
        
        return $output;
    }
}