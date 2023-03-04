<?php

namespace Puth\Traits;

use Exception;
use Puth\GenericObject;
use Puth\Utils\BackTrace;

trait PerformsActionsTrait
{
    private function callMethod($function, $parameters = [])
    {
        // Serialize parameters if needed
        $parameters = array_map(function ($item) {
            if ($item instanceof GenericObject) {
                return $item->serialize();
            }
            return $item;
        }, $parameters);

        $response = $this->getClient()->patch('context/call', ['json' => [
            'context' => $this->getContext()->getRepresentation(),
            'type' => $this->getType(),
            'id' => $this->getId(),
            'function' => $function,
            'parameters' => $parameters,
        ]]);
        
        if ($this->getContext()->isDebug()) {
            $this->log("call: $function (translated: {$this->translateActionReverse($function)}})");
            $this->log('with: ' . json_encode($parameters));
        }

        return $this->handleResponse($response, [$function, $parameters], function ($body, $arguments) {
            throw new Exception(BackTrace::message(
                BackTrace::filter(debug_backtrace()),
                $body->message
            ));
        });
    }

    private function getProperty($property)
    {
        $response = $this->getClient()->patch('context/get', ['json' => [
            'context' => $this->getContext()->getRepresentation(),
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

    private function handleResponse($response, $arguments, $onError)
    {
        if ($response->getStatusCode() !== 200) {
            throw new \Exception("Puth server returned status code: {$response->getStatusCode()}");
        }
        
        if ($this->getContext()->isDebug()) {
            $this->log('return: ', false);
            var_export($this->toJson($response->getBody()));
            print("\n\n");
        }
    
        // Check if binary response body
        foreach ($response->getHeader('Content-Type') as $value) {
            if (str_contains($value, 'application/octet-stream')) {
                return $response->getBody();
            }
        }
        
        $body = $this->toJson($response->getBody());

        if (empty($body)) {
            return $this;
        }

        return $this->parseGeneric($body, $arguments, $onError);
    }
    
    private function parseGeneric($generic, $arguments, $onError)
    {
        if (!property_exists($generic, 'type')) {
            throw new \Exception('Puth server response: $body->type not defined!');
        }
        
        return match ($generic->type) {
            'GenericValue', 'GenericValues' => $generic->value,
            'GenericObject' => new GenericObject($generic->id, $generic->type, $generic->represents, $this),
            'GenericObjects' => array_map(
                fn($item) => new GenericObject($item->id, $item->type, $item->represents, $this),
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

    private function toJson($response)
    {
        return json_decode($response);
    }
}
