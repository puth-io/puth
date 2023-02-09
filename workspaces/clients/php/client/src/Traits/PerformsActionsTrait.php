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

        $this->log('call method > ' . $this->translateActionReverse($function));

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

        $this->log('get property > ' . $property);

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

        $body = $this->toJson($response->getBody());

        if ($this->getContext()->isDebug()) {
            var_dump($body);
        }

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
