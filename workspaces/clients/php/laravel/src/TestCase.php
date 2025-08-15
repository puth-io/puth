<?php

namespace Puth\Laravel;

use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Foundation\Testing\TestCase as FoundationTestCase;
use Illuminate\Http\UploadedFile;
use Illuminate\Testing\TestResponseAssert as PHPUnit;
use PHPUnit\Runner\Version;
use Puth\Context;
use Puth\Laravel\Concerns\ProvidesBrowser;
use Puth\Laravel\Facades\Puth;
use Puth\Traits\PuthAssertions;
use Puth\Utils\BackTrace;
use Puth\Utils\MimeType;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\StreamedJsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

abstract class TestCase extends FoundationTestCase
{
    use ProvidesBrowser;
    use PuthAssertions;
    
    public Context $context;
    
    public static bool $debug = false;
    
    protected function setUp(): void
    {
        parent::setUp();
        
        static::$debug = static::$debug ?: config('puth.debug', false);
    
        $this->context = new Context(Puth::instanceUrl(), array_merge([
            'test' => [
                'name' => $this->getPhpunitTestName(),
                'group' => get_class($this),
            ],
            'snapshot' => true,
            'debug' => static::$debug,
            'supports' => [
                'portal' => [
                    'urlPrefixes' => $this->requestInterceptionUrlPrefixes(),
                ],
            ],
        ], $this->getContextOptions()));

        $this->context->setTestCase($this);

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

    public function requestInterceptionUrlPrefixes(): array
    {
        return [$this->baseUrl()];
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
        throw new \Exception('User resolver has not been set.');
    }

    // portal request handling
    public function handlePortalRequest(object $portalRequest)
    {
        if ($portalRequest->path !== '/' && file_exists($staticFile = public_path($portalRequest->path))) {
            $content = file_get_contents($staticFile);
            $mimeType = MimeType::detector()->detectMimeType($staticFile, $content);
            return [
                'body' => base64_encode($content),
                'headers' => [
                    'Content-Type' => $mimeType,
                ],
                'status' => 200,
            ];
        }

        $kernel = $this->app->make(HttpKernel::class);
        $request = $this->parsePortalRequest($portalRequest);
        $response = $kernel->handle(
            $request = $this->createTestRequest($request)
        );
        $kernel->terminate($request, $response);

        $testResponse = $this->createTestResponse($response, $request);

        $body = '';
        if ($testResponse->baseResponse instanceof StreamedResponse
            || $testResponse->baseResponse instanceof StreamedJsonResponse) {
            $body = $testResponse->streamedContent();
        } else {
            $body = $testResponse->content();
        }

        return [
            'body' => base64_encode($body),
            'headers' => $testResponse->headers->all(),
            'status' => $testResponse->getStatusCode(),
        ];
    }

    public function parsePortalRequest(object $portalRequest): Request
    {
        $server = $this->transformHeadersToServerVars((array) $portalRequest->headers);
        $server['REQUEST_METHOD'] = strtoupper($portalRequest->method);
        $server['REQUEST_URI'] = $portalRequest->url;

        $cookies = $this->prepareCookiesForRequest();

        $url = parse_url($portalRequest->url);
        $queryParams = [];
        if (isset($url['query'])) {
            parse_str($url['query'], $queryParams);
        }
        $server['HTTP_HOST'] = "{$url['host']}:{$url['port']}";

        $cookies = [];
        if (isset($headers['cookie'])) {
            parse_str(str_replace('; ', '&', $headers['cookie']), $cookies);
        }

        $request = new Request(
            $queryParams, // GET
            [], // POST
            [], // attributes
            $cookies, // COOKIE
            [], // FILES
            $server,
            base64_decode($portalRequest->data),
        );

        static::populateParametersFromBody($request);

        return $request;
    }

    protected static function populateParametersFromBody(Request $request): void
    {
        $contentType = $request->headers->get('Content-Type', '');

        if (str_starts_with($contentType, 'application/json')) {
            $parsed = json_decode($request->getContent(), true);
            if (is_array($parsed)) {
                $request->request->replace($parsed);
            }
        } else if (str_starts_with($contentType, 'application/x-www-form-urlencoded')) {
            parse_str($request->getContent(), $parsed);
            $request->request->replace($parsed);
        } else if (str_starts_with($contentType, 'multipart/form-data')) {
            $boundary = self::extractBoundary($contentType);
            if ($boundary) {
                $parsed = self::parseMultipart($request->getContent(), $boundary);
                $request->request->replace($parsed['fields'] ?? []);
                $request->files->replace($parsed['files'] ?? []);
            }
        } else if (str_starts_with($contentType, 'text/plain')) {
            parse_str($request->getContent(), $parsed);
            $request->request->replace($parsed);
        } else if (str_starts_with($contentType, 'application/xml') || str_starts_with($contentType, 'text/xml')) {
            $xml = simplexml_load_string($request->getContent(), "SimpleXMLElement", LIBXML_NOCDATA);
            if ($xml !== false) {
                $json = json_decode(json_encode($xml), true);
                $request->request->replace(is_array($json) ? $json : []);
            }
        } else {
            $request->request->set('raw_body', $request->getContent());
        }
    }

    protected static function extractBoundary(string $contentType): ?string
    {
        if (preg_match('/boundary=(.*)$/', $contentType, $matches)) {
            return trim($matches[1], '"');
        }

        return null;
    }

    protected static function parseMultipart(string $body, string $boundary): array
    {
        $result = ['fields' => [], 'files' => []];
        $parts = preg_split('/--' . preg_quote($boundary, '/') . '(--)?\s*/', $body, -1, PREG_SPLIT_NO_EMPTY);

        foreach ($parts as $part) {
            if (!str_contains($part, "\r\n\r\n")) continue;

            [$rawHeaders, $content] = explode("\r\n\r\n", $part, 2);
            $rawHeaders = explode("\r\n", trim($rawHeaders));
            $headers = [];

            foreach ($rawHeaders as $line) {
                [$name, $value] = explode(':', $line, 2);
                $headers[strtolower(trim($name))] = trim($value);
            }

            if (!isset($headers['content-disposition'])) continue;
            if (!preg_match('/form-data; *name="([^"]+)"(?:; *filename="([^"]+)")?/', $headers['content-disposition'], $matches)) continue;

            $name = $matches[1];
            $filename = $matches[2] ?? null;
            if (str_ends_with($content, "\r\n")) {
                $content = substr($content, 0, -2);
            }

            if ($filename) {
                $tmpPath = tempnam(sys_get_temp_dir(), 'upload_');
                file_put_contents($tmpPath, $content);
                $mime = $headers['content-type'] ?? 'application/octet-stream';
                $file = new UploadedFile($tmpPath, $filename, $mime, null, true);

                if (str_ends_with($name, '[]')) {
                    $short = mb_substr($name, 0, -2);
                    if (!array_key_exists($short, $result['files'])) $result['files'][$short] = [];
                    $result['files'][$short][] = $file;
                } else {
                    $result['files'][$name] = $file;
                }
            } else {
                $result['fields'][$name] = $content;
            }
        }

        return $result;
    }
}
