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

        if (!property_exists($body, 'type')) {
            throw new \Exception('Puth server response: $body->type not defined!');
        }

        if ($body->type === 'error') {
            return $onError($body, $arguments);
        } else if ($body->type === 'GenericObject') {
            return new GenericObject($body->id, $body->type, $body->represents, $this);
        } else if ($body->type === 'GenericObjects') {
            return array_map(function ($item) {
                return new GenericObject($item->id, $item->type, $item->represents, $this);
            }, $body->value);
        } else if ($body->type === 'GenericValue') {
            return $body->value;
        } else if ($body->type === 'GenericValues') {
            return $body->value;
        } else if ($body->type === 'GenericNull') {
            return null;
        } else if ($body->type === 'GenericSelf') {
            return $this;
        } else if ($body->type === 'GenericUndefined') {
            return $this;
        } else if ($body->type === 'PuthAssertion') {
            return $body;
        } else {
            $this->log('unhandled body type: ' . $body->type);
        }

        return $this;
    }

    private function toJson($response)
    {
        return json_decode($response);
    }
}
