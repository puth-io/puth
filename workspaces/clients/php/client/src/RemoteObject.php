<?php

namespace Puth;

use Closure;
use Exception;
use Puth\Utils\BackTrace;
use Puth\Utils\DontProxy;
use RuntimeException;
use Symfony\Component\HttpFoundation\Request;

class RemoteObject
{
    private array $propertyAliases = [
        'get' => '$',
        'getAll' => '$$',
        'getAllEval' => '$$eval',
        'getEval' => '$eval',
        'getX' => '$x',
    ];

    function __construct(
        public readonly string $id,
        public readonly string $type,
        public readonly string $represents,
        public readonly ?RemoteObject $parent,
        public readonly Context $context,
    )
    {
    }

    static function from(RemoteObject $remoteObject): static
    {
        return new static(
            $remoteObject->id,
            $remoteObject->type,
            $remoteObject->represents,
            $remoteObject->parent,
            $remoteObject->context,
        );
    }

    protected function callFunc($function, $parameters = []): mixed
    {
        // Serialize parameters if needed
        $parameters = array_map(function ($item) {
            if ($item instanceof RemoteObject) {
                return $item->serialize();
            }
            return $item;
        }, $parameters);

        $packet = [
            'context' => $this->context->serialize(),
            'type' => $this->type,
            'id' => $this->id,
            'function' => $function,
            'parameters' => $parameters,
        ];

        if ($this->context->accumulateCalls) {
            $this->context->accumulatedCalls[] = $packet;
            return new DontProxy();
        }

        if ($this->context->debug) {
            $this->log("call: $function (translated: {$this->translateActionReverse($function)}})");
            $this->log('with: ' . json_encode($parameters));
        }

        $response = $this->context->client->patch('context/call', ['json' => $packet]);

        return $this->handleResponse($response, [$function, $parameters], function ($body, $arguments) {
            throw new Exception(BackTrace::message(
                BackTrace::filter(debug_backtrace()),
                '[Server] ' . $body->message,
            ));
        });
    }

    public function sendAccumulatedCalls($type)
    {
        if ($this->context->debug) {
            $this->log("call multiple");
            $this->log('with: ' . json_encode($this->context->accumulatedCalls));
        }

        $response = $this->context->client->patch("context/call/{$type}", ['json' => [
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
                        $body->message,
                    ));
                },
            );
        }

        $this->context->accumulatedCalls = [];

        return $return;
    }

    protected function getProperty($property)
    {
        $response = $this->context->client->patch('context/get', ['json' => [
            'context' => $this->context->serialize(),
            'type' => $this->type,
            'id' => $this->id,
            'property' => $property,
        ]]);

        $this->log('get: ' . $property);

        return $this->handleResponse(
            $response,
            [$property],
            fn($body, $arguments) => throw new Exception(BackTrace::message(
                BackTrace::filter(debug_backtrace()),
                "Undefined property: '{$arguments[0]}' (" . get_class($this) . "::\${$arguments[0]})",
            )),
        );
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

    protected function parseGeneric($generic, $arguments, Closure $onError)
    {
        if (!property_exists($generic, 'type')) {
            throw new \Exception('Puth server response: $body->type not defined!');
        }

        if (property_exists($generic, 'meta')) {
            if (property_exists($generic->meta, 'assertions')) {
                if ($this->context->hasTestCase()) {
                    $this->context->testCase->addToAssertionCount($generic->meta->assertions);
                }
            }
        }

        if ($generic->type === 'ServerRequest') {
            return $this->handlePortalRequestResponse($generic, $arguments, $onError);
        }

        if ($generic->type === 'ExpectationFailed') {
            $this->handleExpectationFailed($generic, $arguments);
        } else if ($generic->type === 'error') {
            $onError($generic, $arguments);
        }

        return match ($generic->type) {
            'GenericValue', 'GenericValues' => $generic->value,
            'GenericObject' => $this->resolveGenericObject($generic),
            'GenericObjects' => array_map(
                fn($item) => $this->resolveGenericObject($item),
                $generic->value,
            ),
            'GenericArray' => array_map(
                fn($item) => $this->parseGeneric($item, $arguments, $onError),
                $generic->value,
            ),
            'GenericNull' => null,
            'GenericSelf', 'GenericUndefined' => $this,
            'PuthAssertion' => $generic,
            default => throw new RuntimeException('Unexpected generic type ' . $generic->type),
        };
    }

    /**
     * @throws Exception
     */
    private function handleExpectationFailed($generic, $arguments): never
    {
        $message = BackTrace::message(
            BackTrace::filter(debug_backtrace()),
            $generic?->value?->message ?? 'Unknown error',
        );

        // TODO performance: we should only evaluate if ExpectationFailedException exists once
        if (class_exists('\\PHPUnit\\Framework\\ExpectationFailedException')) {
            throw new \PHPUnit\Framework\ExpectationFailedException($message);
        }

        throw new Exception($message);
    }

    private function handlePortalRequestResponse($generic, $arguments, Closure $onError)
    {
        $this->log('server-request');
        $response = ['type' => 'PortalResponse'];

        try {
            if ($this->context->testCase !== null
                && class_exists('\\Illuminate\\Foundation\\Testing\\TestCase')
                && $this->context->testCase instanceof \Illuminate\Foundation\Testing\TestCase) {
                $response = $this->context->testCase->handlePortalRequest($generic->value->request);
            }
        } catch (\Throwable $throwable) {
            print_r($throwable);
            dd($throwable);
        }

        $this->log('server-request response');

        $portalResponse = $this->context->client->patch('portal/response', ['json' => [
            'context' => $this->context->serialize(),
            'response' => $response,
        ]]);

        return $this->handleResponse(
            $portalResponse,
            $arguments,
            $onError,
        );
    }

    private function resolveGenericObject($generic): mixed
    {
        $represents = $generic->represents;

        if (class_exists($class = "\\Puth\\Proxies\\$represents")) {
            return new $class($generic->id, $generic->type, $generic->represents, $this, $this->context);
        }
        if (class_exists($class = "\\Puth\\RemoteObjects\\$represents")) {
            return new $class($generic->id, $generic->type, $generic->represents, $this, $this->context);
        }

        return new RemoteObject($generic->id, $generic->type, $generic->represents, $this, $this->context);
    }

    public function __call($name, $arguments)
    {
        $this->log('__call > ' . $name);

        return $this->callFunc($this->translateAction($name), $arguments);
    }

    public function __get($property)
    {
        $this->log('__get > ' . $property);

        return $this->getProperty($property);
    }

    protected function hasActionTranslation($action)
    {
        return array_key_exists($action, $this->propertyAliases);
    }

    protected function getActionTranslation($action)
    {
        return $this->propertyAliases[$action];
    }

    protected function getActionTranslationReverse($action)
    {
        foreach ($this->propertyAliases as $key => $translation) {
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
        $this->parent->log('[GEN ' . $this->represents . '] ' . $string, $newline);
    }

    /**
     * @return array
     * @internal
     */
    public function serialize()
    {
        return [
            'id' => $this->id,
            'type' => $this->type,
            'represents' => $this->represents,
        ];
    }

    /**
     * @return string
     * @internal
     */
    public function __toString()
    {
        return "GenericObject({$this->represents}, {$this->id})";
    }
}
