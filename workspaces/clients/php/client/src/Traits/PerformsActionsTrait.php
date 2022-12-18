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
        $parameters = array_map(
            fn($item) => $item instanceof GenericObject ? $item->serialize() : $item,
            $parameters,
        );

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
            return $this->makeGenericObject($body, $this);
        } else if ($body->type === 'GenericObjects') {
            return array_map(function ($item) {
                return $this->makeGenericObject($item, $this);
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

    private function makeGenericObject($genericObject, &$parent)
    {
        if ($class = $this->resolveRepresentationClass($genericObject->represents)) {
            return new ('Puth\\Objects\\' . $class)($genericObject->id, $genericObject->type, $genericObject->represents, $parent);
        }

        return new GenericObject($genericObject->id, $genericObject->type, $genericObject->represents, $parent);
    }

    private function resolveRepresentationClass($class)
    {
        return match ($class) {
            'Accessibility' => 'Accessibility',
            'CDPBrowser' => 'Browser',
            'BrowserContext' => 'BrowserContext',
            'Coverage' => 'Coverage',
            'ElementHandle' => 'ElementHandle',
            'EventEmitter' => 'EventEmitter',
            'FileChooser' => 'FileChooser',
            'Frame' => 'Frame',
            'HTTPRequest' => 'HTTPRequest',
            'HTTPResponse' => 'HTTPResponse',
            'JSHandle' => 'JSHandle',
            'Keyboard' => 'Keyboard',
            'Metrics' => 'Metrics',
            'Mouse' => 'Mouse',
            'CDPPage' => 'Page',
            'Target' => 'Target',
            'Touchscreen' => 'Touchscreen',
            'Tracing' => 'Tracing',
            'Viewport' => 'Viewport',
            default => false,
        };
    }

    private function toJson($response)
    {
        return json_decode($response);
    }
}
