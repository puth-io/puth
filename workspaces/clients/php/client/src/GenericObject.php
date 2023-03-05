<?php

namespace Puth;

use Exception;
use Puth\Utils\BackTrace;

class GenericObject
{
    protected Context $context;

    protected $parent;
    
    protected $id;
    protected $type;
    protected $represents;

    protected $actionTranslations = [
        'get' => '$',
        'getAll' => '$$',
        'getAllEval' => '$$eval',
        'getEval' => '$eval',
        'getX' => '$x',
    ];

    function __construct($id, $type, $represents, $parent, $context)
    {
        $this->id = $id;
        $this->type = $type;
        $this->represents = $represents;
        $this->parent = $parent;
        $this->context = $context;
    }
    
    protected function callMethod($function, $parameters = []): mixed
    {
        // Serialize parameters if needed
        $parameters = array_map(function ($item) {
            if ($item instanceof GenericObject) {
                return $item->serialize();
            }
            return $item;
        }, $parameters);
        
        $packet = [
            'context' => $this->context->serialize(),
            'type' => $this->getType(),
            'id' => $this->getId(),
            'function' => $function,
            'parameters' => $parameters,
        ];
        
        if ($this->context->accumulateCalls) {
            $this->context->accumulatedCalls[] = $packet;
            return null;
        }
        
        if ($this->context->debug) {
            $this->log("call: $function (translated: {$this->translateActionReverse($function)}})");
            $this->log('with: ' . json_encode($parameters));
        }
        
        $response = $this->getClient()->patch('context/call', ['json' => $packet]);
        
        return $this->handleResponse($response, [$function, $parameters], function ($body, $arguments) {
            throw new Exception(BackTrace::message(
                BackTrace::filter(debug_backtrace()),
                $body->message
            ));
        });
    }
    
    public function sendAccumulatedCalls($type)
    {
        if ($this->context->debug) {
            $this->log("call multiple");
            $this->log('with: ' . json_encode($this->context->accumulatedCalls));
        }
        
        $response = $this->getClient()->patch("context/call/{$type}", ['json' => [
            'context' => $this->context->serialize(),
            'calls' => $this->context->accumulatedCalls,
        ]]);
    
        if ($this->context->debug) {
            $this->log('return: ', false);
            var_export(json_decode($response->getBody()));
            print("\n\n");
        }
    
        $parts = json_decode($response->getBody());
        
        $return = [];
        foreach ($parts as $idx => $part) {
            $call = $this->context->accumulatedCalls[$idx];
        
            $return[] = $this->parseGeneric(
                $part,
                [$call['function'], $call['parameters']],
                function ($body, $arguments) {
                    throw new Exception(BackTrace::message(
                        BackTrace::filter(debug_backtrace()),
                        $body->message
                    ));
                }
            );
        }
        
        $this->context->accumulatedCalls = [];
    
        return $return;
    }
    
    protected function getProperty($property)
    {
        $response = $this->getClient()->patch('context/get', ['json' => [
            'context' => $this->context->serialize(),
            'type' => $this->getType(),
            'id' => $this->getId(),
            'property' => $property,
        ]]);
        
        $this->log('get: ' . $property);
        
        return $this->handleResponse($response, [$property], function ($body, $arguments) {
            throw new Exception(BackTrace::message(
                BackTrace::filter(debug_backtrace()),
                "Undefined property: '{$arguments[0]}' (" . get_class($this) . "::\${$arguments[0]})"
            ));
        });
    }
    
    protected function handleResponse($response, $arguments, $onError)
    {
        if ($response->getStatusCode() !== 200) {
            throw new \Exception("Puth server returned status code: {$response->getStatusCode()}");
        }
        
        if ($this->context->debug) {
            $this->log('return: ', false);
            var_export(json_decode($response->getBody()));
            print("\n\n");
        }
        
        // Check if binary response body
        foreach ($response->getHeader('Content-Type') as $value) {
            if (str_contains($value, 'application/octet-stream')) {
                return $response->getBody();
            }
        }
        
        $body = json_decode($response->getBody());
        
        if (empty($body)) {
            return $this;
        }
        
        return $this->parseGeneric($body, $arguments, $onError);
    }
    
    protected function parseGeneric($generic, $arguments, $onError)
    {
        if (!property_exists($generic, 'type')) {
            throw new \Exception('Puth server response: $body->type not defined!');
        }
        
        return match ($generic->type) {
            'GenericValue', 'GenericValues' => $generic->value,
            'GenericObject' => new GenericObject($generic->id, $generic->type, $generic->represents, $this, $this->context),
            'GenericObjects' => array_map(
                fn($item) => new GenericObject($item->id, $item->type, $item->represents, $this, $this->context),
                $generic->value
            ),
            'GenericArray' => array_map(
                fn($item) => $this->parseGeneric($item, $arguments, $onError),
                $generic->value
            ),
            'GenericNull' => null,
            'GenericSelf', 'GenericUndefined' => $this,
            'PuthAssertion' => $generic,
            'error' => $onError($generic, $arguments),
            default => $this,
        };
    }
    
    public function __call($name, $arguments)
    {
        $this->log('__call > ' . $name);
        
        return $this->callMethod($this->translateAction($name), $arguments);
    }
    
    public function __get($property)
    {
        $this->log('__get > ' . $property);
        
        return $this->getProperty($property);
    }
    
    protected function hasActionTranslation($action)
    {
        return array_key_exists($action, $this->actionTranslations);
    }
    
    protected function getActionTranslation($action)
    {
        return $this->actionTranslations[$action];
    }
    
    protected function getActionTranslationReverse($action)
    {
        foreach ($this->actionTranslations as $key => $translation) {
            if ($translation === $action) {
                return $key;
            }
        }
        return null;
    }
    
    protected function translateAction($action)
    {
        if ($this->hasActionTranslation($action)) {
            return $this->getActionTranslation($action);
        }
        return $action;
    }
    
    protected function translateActionReverse($action)
    {
        $reverse = $this->getActionTranslationReverse($action);
        
        if ($reverse) {
            return $reverse;
        }
        
        return $action;
    }

    protected function log($string, $newline = true)
    {
        $this->parent->log('[GEN ' . $this->getRepresents() . '] ' . $string, $newline);
    }
    
    public function getId()
    {
        return $this->id;
    }
    
    public function getType()
    {
        return $this->type;
    }
    
    public function getRepresents()
    {
        return $this->represents;
    }
    
    public function getClient()
    {
        return $this->parent->getClient();
    }
    
    public function serialize() {
        return [
            'id' => $this->getId(),
            'type' => $this->getType(),
            'represents' => $this->getRepresents(),
        ];
    }
    
    public function __toString() {
        return "GenericObject({$this->getRepresents()}, {$this->getId()})";
    }
}
