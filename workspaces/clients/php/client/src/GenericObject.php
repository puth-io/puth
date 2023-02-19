<?php

namespace Puth;

use Puth\Traits\ActionTranslationTrait;
use Puth\Traits\PerformsActionsTrait;


class GenericObject
{
    use ActionTranslationTrait, PerformsActionsTrait;

    protected $parent;
    protected $id;
    protected $type;

    protected $represents;

    private $actionTranslations = [
        'get' => '$',
        'getAll' => '$$',
        'getAllEval' => '$$eval',
        'getEval' => '$eval',
        'getX' => '$x',
    ];

    function __construct($id, $type, $represents, $parent)
    {
        $this->id = $id;
        $this->type = $type;
        $this->represents = $represents;
        $this->parent = $parent;
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
    
    public function getContext() {
        if ($this->parent instanceof Context) {
            return $this->parent;
        }
        
        return $this->parent->getContext();
    }
    
    public function serialize() {
        return [
            'id' => $this->getId(),
            'type' => $this->getType(),
            'represents' => $this->getRepresents(),
        ];
    }

    public function within($func)
    {
        $func($this);
    }

    public function getId()
    {
        return $this->id;
    }

    public function getType()
    {
        return $this->type;
    }

    public function getClient()
    {
        return $this->getParent()->getClient();
    }

    public function getParent()
    {
        return $this->parent;
    }

    private function toJson($response)
    {
        return json_decode($response);
    }

    public function getRepresents()
    {
        return $this->represents;
    }

    private function log($string, $newline = true)
    {
        $this->getParent()->log('[GEN ' . $this->getRepresents() . '] ' . $string, $newline);
    }
    
    public function __toString() {
        return "GenericObject({$this->getRepresents()}, {$this->getId()})";
    }
}
