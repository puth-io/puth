<?php

namespace tests\Browser;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;
use Puth\Laravel\Browser;
use Puth\Laravel\PuthEnablePortal;
use Tests\PuthTestCase;
use PHPUnit\Framework\Assert;

class PortalTest extends PuthTestCase
{
    use PuthEnablePortal;

    public static bool $debug = false;

    private static int $hits = 0;

    /** Opens a page on the origin of the app, so its content can make requests through the portal. */
    private function onApp(Browser $browser, string $html = ''): Browser
    {
        return $browser->visit('/')->setContent("<!doctype html><html><head><title>Portal</title></head><body>{$html}</body></html>");
    }

    /** Runs a promise-returning expression in the page and decodes its JSON. */
    private function resolveJson(Browser $browser, string $expression): mixed
    {
        return json_decode($browser->evaluate("({$expression}).then((value) => JSON.stringify(value))"), true);
    }

    public function handlePortalRequest(object $portalRequest)
    {
        if (str_ends_with($portalRequest->path, '/portal-client-failure')) {
            throw new \RuntimeException('The portal client failed.');
        }

        return parent::handlePortalRequest($portalRequest);
    }

    function test_portal_client_failure_fails_the_browser_request()
    {
        $this->browse(function (Browser $browser) {
            $result = $browser->visit('/')
                ->evaluate("fetch('/portal-client-failure').then(() => 'loaded', error => error.name)");

            Assert::assertSame('TypeError', $result);
        });
    }

    function test_portal_login_updates_test_authentication()
    {
        $user = User::factory()->create();

        $this->browse(function (Browser $browser) use ($user) {
            $browser->visit('/')
                ->loginAs($user)
                ->assertAuthenticatedAs($user);
        });

        $this->assertAuthenticatedAs($user);
    }

    function test_portal_facade_fake()
    {
        Mail::fake();
        $this->browse(function (Browser $browser) {
            $browser->visit('/send/mail')
                ->assertRouteIs('send.mail');
        });
        Mail::assertSentCount(1);
    }

    function test_portal_form_url_encode()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<html><body>
                <form action="' . config('app.url') . '/?queryTest=1234" method="post">
                    <input type="text" name="form-test" value="1234">
                    <button>submit</button>
                </form>
            </body></html>');
            $browser->click('button')
                ->waitForText('form-test')
                ->assertSee('"form-test":"1234"')
                ->assertSee('"queryTest":"1234"')
            ;
        });
    }

    function test_portal_form_multipart()
    {
        $this->browse(function (Browser $browser) {
            $browser->setContent('<html><body>
                <form action="' . config('app.url') . '/?queryTest=1234" method="post" enctype="multipart/form-data">
                    <input type="file" name="form-single">
                    <input type="file" name="form-multiple[]" multiple>
                    <button>submit</button>
                </form>
            </body></html>');
            $browser
                ->attach('form-single', __DIR__ . '/files/test.txt')
                ->attach('form-multiple[]', [
                    __DIR__ . '/files/random.binary',
                    __DIR__ . '/files/test2.txt',
                ])
                ->click('button')
                ->waitForText('form-single');

            $content = str_replace('<html><head></head><body>', '', $browser->content());
            $content = str_replace('</body></html>', '', $content);
            $content = json_decode($content, true);

            Assert::assertEquals('1234', $content['input']['queryTest']);
            Assert::assertEquals(33, $content['files']['form-single']['size']);
            Assert::assertEquals(file_get_contents(__DIR__ . '/files/test.txt'), base64_decode($content['files']['form-single']['content']));

            Assert::assertEquals(256, $content['files']['form-multiple'][0]['size']);
            Assert::assertEquals(file_get_contents(__DIR__ . '/files/random.binary'), base64_decode($content['files']['form-multiple'][0]['content']));
            Assert::assertEquals(33, $content['files']['form-multiple'][1]['size']);
            Assert::assertEquals(file_get_contents(__DIR__ . '/files/test2.txt'), base64_decode($content['files']['form-multiple'][1]['content']));
        });
    }

    function test_portal_serves_javascript_by_its_extension()
    {
        // Minified ES modules like the ones of Vite sniff as text/x-java, which browsers refuse to run.
        $files = [
            public_path('portal-module.js') => 'import{a as b}from"./portal-module-dep.js";document.title=b;',
            public_path('portal-module-dep.js') => "const a = 'module ran';\nexport { a };\n",
        ];
        foreach ($files as $path => $content) {
            file_put_contents($path, $content);
        }
        $this->beforeApplicationDestroyed(fn () => array_map('unlink', array_keys($files)));

        $this->browse(function (Browser $browser) {
            $this->onApp($browser);

            $type = $this->resolveJson($browser, "fetch('/portal-module.js').then((response) => response.headers.get('content-type'))");
            Assert::assertMatchesRegularExpression('#^(text|application)/javascript#', (string) $type);

            $browser->setContent('<!doctype html><title>waiting</title><script type="module" src="/portal-module.js"></script>')
                ->waitUntil("document.title === 'module ran'", 3);
        });
    }

    function test_portal_keeps_the_query_string()
    {
        Route::get('/portal-query', fn (Request $request) => [
            'query_string' => $request->getQueryString(),
            'full_url' => $request->fullUrl(),
            'input' => $request->query(),
        ]);

        $this->browse(function (Browser $browser) {
            $seen = $this->resolveJson($this->onApp($browser), "fetch('/portal-query?filter=a&page=2').then((response) => response.json())");

            Assert::assertSame(['filter' => 'a', 'page' => '2'], $seen['input']);
            Assert::assertSame('filter=a&page=2', $seen['query_string']);
            Assert::assertStringEndsWith('/portal-query?filter=a&page=2', $seen['full_url']);
        });
    }

    function test_portal_xhr_upload_with_indexed_names()
    {
        Route::post('/portal-upload', fn (Request $request) => [
            'content_type' => $request->header('Content-Type'),
            'input' => $request->input(),
            'files' => array_map(fn ($file) => is_array($file) ? array_map(fn ($f) => $f->getClientOriginalName(), $file) : $file->getClientOriginalName(), $request->allFiles()),
        ]);

        $this->browse(function (Browser $browser) {
            // Inertia's forceFormData sends indexed names like this. Multipart bodies take the detour, which
            // Chrome must not block as a request to a more private network.
            $result = $this->resolveJson($this->onApp($browser), <<<'JS'
                new Promise((resolve) => {
                    const data = new FormData();
                    data.append('files[0]', new File(['first'], 'first.txt', { type: 'text/plain' }));
                    data.append('files[1]', new File(['second'], 'second.txt', { type: 'text/plain' }));
                    data.append('meta[a][b]', 'deep');
                    data.append('tags[]', 'one');
                    data.append('tags[]', 'two');
                    data.append('note', 'flat');
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', '/portal-upload');
                    xhr.onload = () => resolve({ status: xhr.status, body: JSON.parse(xhr.responseText) });
                    xhr.onerror = () => resolve({ status: 'network error' });
                    xhr.send(data);
                })
                JS);

            Assert::assertSame(200, $result['status'] ?? null, json_encode($result));
            Assert::assertStringStartsWith('multipart/form-data; boundary=', (string) $result['body']['content_type']);
            Assert::assertSame(['meta' => ['a' => ['b' => 'deep']], 'tags' => ['one', 'two'], 'note' => 'flat'], $result['body']['input']);
            Assert::assertSame(['files' => ['first.txt', 'second.txt']], $result['body']['files']);
        });
    }

    function test_portal_receives_the_cookies_of_the_browser()
    {
        Route::get('/portal-cookies', fn (Request $request) => $request->cookies->all());

        $this->browse(function (Browser $browser) {
            $this->onApp($browser)->evaluate("document.cookie = 'probe=yes; path=/', document.cookie = 'dotted.name=a%20b; path=/', true");

            $cookies = $this->resolveJson($browser, "fetch('/portal-cookies').then((response) => response.json())");

            Assert::assertSame('yes', $cookies['probe'] ?? null, json_encode($cookies));
            Assert::assertSame('a b', $cookies['dotted.name'] ?? null, json_encode($cookies));
        });
    }

    function test_portal_answers_requests_during_pause()
    {
        self::$hits = 0;
        Route::get('/portal-hit', function () {
            self::$hits++;

            return 'ok';
        });

        $this->browse(function (Browser $browser) {
            // The request starts after evaluate() returned, so it falls into the pause.
            $this->onApp($browser)->evaluate("setTimeout(() => fetch('/portal-hit'), 200), true");

            $browser->pause(1000);

            Assert::assertSame(1, self::$hits);
        });
    }

    function test_portal_answers_requests_during_wait_using()
    {
        self::$hits = 0;
        Route::get('/portal-hit', function () {
            self::$hits++;

            return 'ok';
        });

        $this->browse(function (Browser $browser) {
            $this->onApp($browser)->evaluate("setTimeout(() => fetch('/portal-hit'), 200), true");

            $browser->waitUsing(2, 100, fn () => self::$hits === 1);
        });
    }
}
