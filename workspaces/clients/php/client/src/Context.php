<?php

namespace Puth;

use GuzzleHttp\Client;
use Puth\Objects\Browser;
use Puth\Traits\ActionTranslationTrait;
use Puth\Traits\PerformsActionsTrait;


/**
 * @method Browser connectBrowser(string[] $array)
 * @method Browser createBrowser(string[] $array)
 */
class Context
{
    use ActionTranslationTrait, PerformsActionsTrait;

    protected $baseUrl;
    protected $options;
    protected $client;

    protected $id;
    protected $type = 'Context';

    private $actionTranslations = [];

    function __construct($baseUrl, $options = [])
    {
        $this->baseUrl = $baseUrl;
        $this->options = $options;

        $this->client =  new Client([
            'base_uri' => $this->baseUrl,
        ]);

        $this->instantiate();
    }

    private function instantiate()
    {
        $response = $this->toJson($this->client->post('context', ['json' => $this->options])->getBody());

        $this->id = $response->id;
        $this->type = $response->type;

        $this->log("Created");
    }

    public function destroy($options)
    {
        $response = $this->client->delete('context', [
            'json' => array_merge(
                $options,
                $this->getRepresentation()
            ),
        ]);
        $statusCode = $response->getStatusCode();

        if ($statusCode === 200) {
            $this->log("Destroyed");
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

    public function getRepresentation() {
        return [
            'id' => $this->getId(),
            'type' => $this->getType(),
        ];
    }

    public function isDebug() {
        return $this->options['debug'] === true;
    }

    public function isDev() {
        return $this->options['dev'] === true;
    }

    public function getContext() {
        return $this;
    }

    public function __call($name, $arguments)
    {
        $this->log('__call > ' . $name);

        return $this->callMethod($this->translateAction($name), $arguments);
    }

    public function __get($property) {
        $this->log('__get > ' . $property);

        return $this->getProperty($property);
    }

    public function getClient() {
        return $this->client;
    }

    public function getId()
    {
        return $this->id;
    }

    public function getType()
    {
        return $this->type;
    }

    public function log($string)
    {
        if ($this->isDebug()) {
            print('[E2E ' . substr($this->id, 0, 4) . '] ' . $string . "\n");
        }
    }
}
