<?php

namespace Puth;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use Puth\RemoteObjects\Context as BaseContext;

class Context extends BaseContext
{
    protected string $baseUrl;
    protected array $options;

    public readonly Client $client;

    protected bool $accumulateCalls = false;
    protected array $accumulatedCalls = [];
    
    protected bool $dev;
    protected bool $debug;

    // TODO protected ?\PHPUnit\Framework\TestCase $testCase;
    protected ?\Illuminate\Foundation\Testing\TestCase $testCase;

    function __construct(string $baseUrl, array $options = [])
    {
        $this->baseUrl = $baseUrl;
        $this->options = $options;

        $this->dev = $this->options['dev'] ?? false;
        $this->debug = $this->options['debug'] ?? false;
        
        $this->client = new Client([
            'base_uri' => $this->baseUrl,
        ]);

        $response = json_decode($this->client->post('context', ['json' => $this->options])->getBody());
        
        parent::__construct(
            $response->id,
            $response->type,
            $response->represents,
            null,
            $this,
        );
    }

    public function destroy($options): void
    {
        try {
            $this->client->delete('context', [
                'json' => array_merge(
                    $options,
                    $this->serialize()
                ),
            ]);
            $this->log("destroyed");
        } catch (ClientException $exception) {
            if ($exception->getResponse()?->getStatusCode() === 404) {
                return;
            }
            
            throw $exception;
        }
    }
    
    public function startAccumulatingCalls(): void
    {
        $this->accumulateCalls = true;
    }
    
    public function stopAccumulatingCalls(): void
    {
        $this->accumulateCalls = false;
    }

    public function log($string, $newline = true)
    {
        if ($this->debug) {
            print('[CTX ' . substr($this->id, 0, 4) . '] ' . $string . ($newline ? "\n" : ''));
        }
    }

    public function setTestCase(\PHPUnit\Framework\TestCase $testCase)
    {
        $this->testCase = $testCase;
    }

    public function hasTestCase()
    {
        return $this->testCase !== null;
    }
}
