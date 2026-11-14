<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use Puth\Laravel\TestCase as PuthTestCase;
use Symfony\Component\HttpFoundation\Request;

class PortalRequestParsingTest extends TestCase
{
    private const BOUNDARY = 'portal-test';

    private function multipart(array $parts): string
    {
        $lines = [];
        foreach ($parts as [$disposition, $content]) {
            array_push($lines, '--'.self::BOUNDARY, "Content-Disposition: form-data; {$disposition}", '', $content);
        }
        array_push($lines, '--'.self::BOUNDARY.'--', '');

        return implode("\r\n", $lines);
    }

    private function populate(string $class, string $body): Request
    {
        $request = Request::create('/', 'POST', server: ['CONTENT_TYPE' => 'multipart/form-data; boundary='.self::BOUNDARY], content: $body);
        (new \ReflectionMethod($class, 'populateParametersFromBody'))->invoke(null, $request);

        return $request;
    }

    public function test_multipart_names_are_nested_like_php_does(): void
    {
        $request = $this->populate(PuthTestCase::class, $this->multipart([
            ['name="files[0]"; filename="first.txt"', 'first'],
            ['name="files[1]"; filename="second.txt"', 'second'],
            ['name="list[]"; filename="third.txt"', 'third'],
            ['name="meta[a][b]"', 'deep'],
            ['name="tags[]"', 'one'],
            ['name="tags[]"', 'two'],
            ['name="note"', 'flat'],
        ]));

        self::assertSame(['meta' => ['a' => ['b' => 'deep']], 'tags' => ['one', 'two'], 'note' => 'flat'], $request->request->all());
        self::assertSame(['first.txt', 'second.txt'], array_map(fn ($file) => $file->getClientOriginalName(), $request->files->all('files')));
        self::assertSame(['third.txt'], array_map(fn ($file) => $file->getClientOriginalName(), $request->files->all('list')));
    }

    public function test_an_overridden_multipart_parser_is_used(): void
    {
        $request = $this->populate(OverridesParseMultipart::class, $this->multipart([['name="note"', 'flat']]));

        self::assertSame(['marker' => 'overridden'], $request->request->all());
    }

    public function test_cookie_header_keeps_names_and_the_first_value(): void
    {
        $parse = new \ReflectionMethod(PuthTestCase::class, 'parseCookieHeader');

        self::assertSame(
            ['session' => 'abc=', 'dotted.name' => 'a b', 'list[0]' => 'x'],
            $parse->invoke(null, 'session=abc%3D; dotted.name=a%20b; list[0]=x; session=shadowed; invalid'),
        );
    }
}

abstract class OverridesParseMultipart extends PuthTestCase
{
    protected static function parseMultipart(string $body, string $boundary): array
    {
        return ['fields' => ['marker' => 'overridden'], 'files' => []];
    }
}
