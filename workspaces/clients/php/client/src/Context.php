<?php

namespace Puth;

use GuzzleHttp\Client;

/**
 * @method connectBrowser(string[] $array)
 * @method createBrowser(string[] $array)
 */
class Context extends GenericObject
{
    protected string $baseUrl;
    protected array $options;
    
    protected Client $client;
    
    protected bool $accumulateCalls = false;
    protected array $accumulatedCalls = [];
    
    protected bool $dev;
    protected bool $debug;
    
    function __construct($baseUrl, $options = [])
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

    public function destroy($options)
    {
        $response = $this->client->delete('context', [
            'json' => array_merge(
                $options,
                $this->serialize()
            ),
        ]);
        $statusCode = $response->getStatusCode();
        
        if ($statusCode === 200) {
            $this->log("destroyed");
            return true;
        } else if ($statusCode === 404) {
            echo $response->getBody();
            
            // Return true because if puth doesn't exist it is already destroyed
            return true;
        } else {
            // Currently not possible by server
            return false;
        }
    }
    
    public function startAccumulatingCalls()
    {
        $this->accumulateCalls = true;
    }
    
    public function stopAccumulatingCalls()
    {
        $this->accumulateCalls = false;
    }
    
    public function getClient(): Client
    {
        return $this->client;
    }
    
    public function log($string, $newline = true)
    {
        if ($this->debug) {
            print('[CTX ' . substr($this->id, 0, 4) . '] ' . $string . ($newline ? "\n" : ''));
        }
    }
}
