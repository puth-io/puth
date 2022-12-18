<?php

namespace Puth\Traits;

trait ActionTranslationTrait {

    function hasActionTranslation($action)
    {
        return array_key_exists($action, $this->actionTranslations);
    }

    function getActionTranslation($action)
    {
        return $this->actionTranslations[$action];
    }

    function getActionTranslationReverse($action)
    {
        foreach ($this->actionTranslations as $key => $translation) {
            if ($translation === $action) {
                return $key;
            }
        }
        return null;
    }

    function translateAction($action)
    {
        if ($this->hasActionTranslation($action)) {
            return $this->getActionTranslation($action);
        }
        return $action;
    }

    function translateActionReverse($action)
    {
        $reverse = $this->getActionTranslationReverse($action);

        if ($reverse) {
            return $reverse;
        }

        return $action;
    }

}