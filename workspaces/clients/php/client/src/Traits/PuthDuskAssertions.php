<?php

namespace Puth\Traits;

use PHPUnit\Framework\Assert;
use Puth\GenericObject;

trait PuthDuskAssertions
{
    use PuthAssertions;
    use PuthUtils;

    /**
     * Assert that the page title is the given value.
     *
     * @param string $title
     * @return $this
     */
    public function assertTitle($title)
    {
        Assert::assertEquals(
            $title, $this->page->title(),
            "Expected title [{$title}] does not equal actual title [{$this->page->title()}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the page title contains the given value.
     *
     * @param string $title
     * @return $this
     */
    public function assertTitleContains($title)
    {
        Assert::assertTrue(
            strpos($this->page->title(), $title) !== false,
            "Did not see expected value [{$title}] within title [{$this->page->title()}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given encrypted cookie is present.
     *
     * @param string $name
     * @return $this
     */
    public function assertHasCookie($name)
    {
        Assert::assertTrue(
            !is_null($this->plainCookie($name)),
            "Did not find expected cookie [{$name}]."
        );
        
        return $this;
    }
    
    // /**
    //  * Assert that the given unencrypted cookie is present.
    //  *
    //  * @param string $name
    //  * @return $this
    //  */
    // public function assertHasPlainCookie($name)
    // {
    //     return $this->assertHasCookie($name, false);
    // }
    
    /**
     * Assert that the given encrypted cookie is not present.
     *
     * @param string $name
     * @return $this
     */
    public function assertCookieMissing($name)
    {
        Assert::assertTrue(
            is_null($this->plainCookie($name)),
            "Found unexpected cookie [{$name}]."
        );
        
        return $this;
    }
    
    // /**
    //  * Assert that the given unencrypted cookie is not present.
    //  *
    //  * @param string $name
    //  * @return $this
    //  */
    // public function assertPlainCookieMissing($name)
    // {
    //     return $this->assertCookieMissing($name, false);
    // }
    
    /**
     * Assert that an encrypted cookie has a given value.
     *
     * @param string $name
     * @param string $value
     * @return $this
     */
    public function assertCookieValue($name, $value)
    {
        $actual = $this->plainCookie($name);

        Assert::assertEquals(
            $value, $actual,
            "Cookie [{$name}] had value [{$actual}], but expected [{$value}]."
        );
        
        return $this;
    }
    
    // /**
    //  * Assert that an unencrypted cookie has a given value.
    //  *
    //  * @param string $name
    //  * @param string $value
    //  * @return $this
    //  */
    // public function assertPlainCookieValue($name, $value)
    // {
    //     return $this->assertCookieValue($name, $value, false);
    // }
    
    /**
     * Assert that the given text appears on the page.
     *
     * @param string $text
     * @param $element
     * @return $this
     */
    public function assertSee($text, $element = null)
    {
        if (!$element) {
            $element = $this->page;
        }
        
        $result = [];
        
        try {
            $result = $element->contains($text);
        } catch (\Exception $exception) {
        };
        
        Assert::assertTrue(
            count($result) > 0,
            "Did not see expected text [{$text}] within element [" . get_class($element) . "]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given text does not appear on the page.
     *
     * @param string $text
     * @return $this
     */
    public function assertDontSee($text, $element = null)
    {
        if (!$element) {
            $element = $this->page;
        }
        
        $result = [];
        
        try {
            // TODO implement retry safe "notContains" function or maybe provide ['negate' => true]?
            $result = $element->contains($text, ['timeout' => -1]);
        } catch (\Exception $exception) {
        };
        
        Assert::assertTrue(
            count($result) === 0,
            "Saw unexpected text [{$text}] within element [" . get_class($element) . "]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given text appears within the given selector.
     *
     * @param string $selector
     * @param string $text
     * @return $this
     */
    public function assertSeeIn($selector, $text)
    {
        return $this->assertSee($text, $this->page->get($selector));
    }
    
    /**
     * Assert that the given text does not appear within the given selector.
     *
     * @param string $selector
     * @param string $text
     * @return $this
     */
    public function assertDontSeeIn($selector, $text)
    {
        return $this->assertDontSee($text, $this->page->get($selector));
    }
    
    /**
     * Assert that the given source code is present on the page.
     *
     * @param string $code
     * @return $this
     */
    public function assertSourceHas($code)
    {
        Assert::assertTrue(
            strpos($this->page->content(), $code) !== false,
            "Did not find expected source code [{$code}]"
        );
        
        return $this;
    }
    
    /**
     * Assert that the given source code is not present on the page.
     *
     * @param string $code
     * @return $this
     */
    public function assertSourceMissing($code)
    {
        Assert::assertFalse(
            strpos($this->page->content(), $code) !== false,
            "Found unexpected source code [{$code}]"
        );
        
        return $this;
    }
    
    /**
     * Assert that the given link is visible.
     *
     * @param string $link
     * @return $this
     */
    public function assertSeeLink($link)
    {
        Assert::assertTrue(
            $this->seeLink($link),
            "Did not see expected link [{$link}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given link is not visible.
     *
     * @param string $link
     * @return $this
     */
    public function assertDontSeeLink($link)
    {
        Assert::assertFalse(
            $this->seeLink($link),
            "Saw unexpected link [{$link}]."
        );
        
        return $this;
    }
    
    /**
     * Determine if the given link is visible.
     *
     * @param string $link
     * @return bool
     */
    public function seeLink($link)
    {
        return $this->visible("a[href='" . $link . "']");
    }
    
    public function visible($selector)
    {
        return $this->page->visible($selector);
    }
    
    /**
     * Assert that the given element or selector is visible.
     *
     * @param $element GenericObject|string
     * @return $this
     */
    public function assertVisible($element)
    {
        Assert::assertTrue(
            $this->page->visible($element),
            "Element [{$element}] is not visible."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given input or text area contains the given value.
     *
     * @param string|GenericObject $field
     * @param string $value
     * @return $this
     */
    public function assertInputValue($field, $value)
    {
        Assert::assertEquals(
            $value, $this->inputValue($field),
            "Expected value [{$value}] for the [{$field}] input does not equal the actual value [{$this->inputValue($field)}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given input or text area does not contain the given value.
     *
     * @param string|GenericObject $field
     * @param string $value
     * @return $this
     */
    public function assertInputValueIsNot($field, $value)
    {
        Assert::assertNotEquals(
            $value, $this->inputValue($field),
            "Value [{$value}] for the [{$field}] input should not equal the actual value."
        );
        
        return $this;
    }
    
    /**
     * Get the value of the given input or text area field.
     *
     * @param string|GenericObject $element
     * @return string
     */
    public function inputValue($element)
    {
        $element = $this->resolveElement($element);
        
        return $element->value();
    }
    
    /**
     * Assert that the given checkbox field is checked.
     *
     * @param string|GenericObject $element
     * @return $this
     */
    public function assertChecked($element)
    {
        $element = $this->resolveElement($element);
        
        Assert::assertTrue(
            $element->getProperty('checked')->jsonValue(),
            "Expected checkbox [{$element}] to be checked, but it wasn't."
        );
        
        return $this;
    }
    
    function resolveElement($element)
    {
        if (is_string($element)) {
            try {
                return $this->page->get($element);
            } catch (\Exception $e) {
                return null;
            }
        }

        return $element;
    }
    
    /**
     * Assert that the given checkbox field is not checked.
     *
     * @param string|GenericObject $element
     * @return $this
     */
    public function assertNotChecked($element)
    {
        $element = $this->resolveElement($element);
        
        Assert::assertFalse(
            $element->getProperty('checked')->jsonValue(),
            "Checkbox [{$element}] was unexpectedly checked."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given radio field is selected.
     *
     * @param string $element
     * @return $this
     */
    public function assertRadioSelected($element)
    {
        $element = $this->resolveElement($element);
        
        Assert::assertTrue(
            $element->getProperty('checked')->jsonValue(),
            "Expected radio [{$element}] to be selected, but it wasn't."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given radio field is not selected.
     *
     * @param string|GenericObject $element
     * @return $this
     */
    public function assertRadioNotSelected($element)
    {
        $element = $this->resolveElement($element);
        
        Assert::assertFalse(
            $element->getProperty('checked')->jsonValue(),
            "Radio [{$element}] was unexpectedly selected."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given select field has the given value selected.
     *
     * @param string|GenericObject $field
     * @param string $value
     * @return $this
     */
    public function assertSelected($field, $value)
    {
        Assert::assertTrue(
            $this->selected($field, $value),
            "Expected value [{$value}] to be selected for [{$field}], but it wasn't."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given select field does not have the given value selected.
     *
     * @param string $field
     * @param string $value
     * @return $this
     */
    public function assertNotSelected($field, $value)
    {
        Assert::assertFalse(
            $this->selected($field, $value),
            "Unexpected value [{$value}] selected for [{$field}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given array of values are available to be selected.
     *
     * @param string|GenericObject $element
     * @param mixed $values
     * @return $this
     */
    public function assertSelectHasOptions($element, $values)
    {
        if (!is_array($values)) {
            $values = [$values];
        }

        $element = $this->resolveElement($element);
        $options = array_map(function ($option) {
            return $option->value();
        }, $element->getAll('option'));

        foreach ($values as $value) {
            Assert::assertTrue(
                in_array($value, $options),
                'Expected options [' . implode(',', $values) . "] for selection field [{$element}] to be available."
            );
        }
        
        return $this;
    }
    
    /**
     * Assert that the given array of values are not available to be selected.
     *
     * @param string $field
     * @param mixed $values
     * @return $this
     */
    public function assertSelectMissingOptions($field, $values)
    {
        if (!is_array($values)) {
            $values = [$values];
        }

        Assert::assertCount(
            0, $this->resolver->resolveSelectOptions($field, $values),
            'Unexpected options [' . implode(',', $values) . "] for selection field [{$field}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given value is available to be selected on the given field.
     *
     * @param string $field
     * @param string $value
     * @return $this
     */
    public function assertSelectHasOption($field, $value)
    {
        return $this->assertSelectHasOptions($field, [$value]);
    }
    
    /**
     * Assert that the given value is not available to be selected on the given field.
     *
     * @param string $field
     * @param string $value
     * @return $this
     */
    public function assertSelectMissingOption($field, $value)
    {
        return $this->assertSelectMissingOptions($field, [$value]);
    }
    
    /**
     * Determine if the given value is selected for the given select field.
     *
     * @param string|GenericObject $element
     * @param string $value
     * @return bool
     */
    public function selected($element, $value)
    {
        $element = $this->resolveElement($element);
        $options = $element->value();
        
        if (!is_array($options)) {
            $options = [$options];
        }
        
        return in_array($value, $options);
    }
    
    /**
     * Assert that the element at the given selector has the given value.
     *
     * @param string|GenericObject $element
     * @param string $value
     * @return $this
     */
    public function assertValue($element, $value)
    {
        $element = $this->resolveElement($element);
        
        Assert::assertEquals(
            $value,
            $element->value()
        );
        
        return $this;
    }
    
    /**
     * Assert that the element at the given selector has the given attribute value.
     *
     * @param string|GenericObject $element
     * @param string $attribute
     * @param string $value
     * @return $this
     */
    public function assertAttribute($element, $attribute, $value)
    {
        $element = $this->resolveElement($element);
        
        $actual = $element->getProperty($attribute)->jsonValue();

        Assert::assertNotNull(
            $actual,
            "Did not see expected attribute [{$attribute}] within element [{$element}]."
        );
        
        Assert::assertEquals(
            $value, $actual,
            "Expected '$attribute' attribute [{$actual}] does not equal expected value [$value]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the element at the given selector has the given data attribute value.
     *
     * @param string $selector
     * @param string $attribute
     * @param string $value
     * @return $this
     */
    public function assertDataAttribute($selector, $attribute, $value)
    {
        return $this->assertAttribute($selector, 'data-' . $attribute, $value);
    }
    
    /**
     * Assert that the element at the given selector has the given aria attribute value.
     *
     * @param string $selector
     * @param string $attribute
     * @param string $value
     * @return $this
     */
    public function assertAriaAttribute($selector, $attribute, $value)
    {
        return $this->assertAttribute($selector, 'aria-' . $attribute, $value);
    }
    
    /**
     * Assert that the element with the given selector is present in the DOM.
     *
     * @param string|GenericObject $element
     * @return $this
     */
    public function assertPresent($element)
    {
        $element = $this->resolveElement($element);
        
        Assert::assertNotNull(
            $element,
            "Element [{$element}] is not present."
        );
        
        return $this;
    }
    
    /**
     * Assert that the element with the given selector is not on the page.
     *
     * @param string|GenericObject $element
     * @return $this
     */
    public function assertMissing($element)
    {
        $element = $this->resolveElement($element);
        
        Assert::assertNull(
            $element,
            "Saw unexpected element [{$element}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that a JavaScript dialog with given message has been opened.
     * @todo change implementation
     * @param string $message
     * @return $this
     */
    // public function assertDialogOpened($message)
    // {
    //     $actualMessage = $this->driver->switchTo()->alert()->getText();
    //
    //     Assert::assertEquals(
    //         $message, $actualMessage,
    //         "Expected dialog message [{$message}] does not equal actual message [{$actualMessage}]."
    //     );
    //
    //     return $this;
    // }
    
    /**
     * Assert that the given field is enabled.
     *
     * @param string|GenericObject $element
     * @return $this
     */
    public function assertEnabled($element)
    {
        $element = $this->resolveElement($element);
        
        Assert::assertFalse(
            $element->getProperty('disabled')->jsonValue(),
            "Expected element [{$element}] to be enabled, but it wasn't."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given field is disabled.
     *
     * @param string|GenericObject $element
     * @return $this
     */
    public function assertDisabled($element)
    {
        $element = $this->resolveElement($element);
        
        Assert::assertTrue(
            $element->getProperty('disabled')->jsonValue(),
            "Expected element [{$element}] to be disabled, but it wasn't."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given button is enabled.
     *
     * @param string|GenericObject $element
     * @return $this
     */
    public function assertButtonEnabled($element)
    {
        return $this->assertEnabled($element);
    }
    
    /**
     * Assert that the given button is disabled.
     *
     * @param string $button
     * @return $this
     */
    public function assertButtonDisabled($button)
    {
        return $this->assertDisabled($button);
    }
    
    /**
     * Assert that the given field is focused.
     *
     * @param string|GenericObject $element
     * @return $this
     */
    public function assertFocused($element)
    {
        $element = $this->resolveElement($element);

        $this->assertElementEquals($this->page->focused(), $element);

        return $this;
    }
    
    /**
     * Assert that the given field is not focused.
     *
     * @param string $element
     * @return $this
     */
    public function assertNotFocused($element)
    {
        $element = $this->resolveElement($element);

        $this->assertElementNotEquals($this->page->focused(), $element);
        
        return $this;
    }
    
    /**
     * Assert that the Vue component's attribute at the given key has the given value.
     *
     * @param string $key
     * @param string $value
     * @param string|null $componentSelector
     * @return $this
     */
    public function assertVue($key, $value, $componentSelector = null)
    {
        Assert::assertEquals($value, $this->vueAttribute($componentSelector, $key));
        
        return $this;
    }
    
    /**
     * Assert that the Vue component's attribute at the given key
     * does not have the given value.
     *
     * @param string $key
     * @param string $value
     * @param string|null $componentSelector
     * @return $this
     */
    public function assertVueIsNot($key, $value, $componentSelector = null)
    {
        Assert::assertNotEquals($value, $this->vueAttribute($componentSelector, $key));
        
        return $this;
    }
    
    /**
     * Assert that the Vue component's attribute at the given key
     * is an array that contains the given value.
     *
     * @param string $key
     * @param string $value
     * @param string|null $componentSelector
     * @return $this
     */
    public function assertVueContains($key, $value, $componentSelector = null)
    {
        $attribute = $this->vueAttribute($componentSelector, $key);
        
        Assert::assertIsArray($attribute, "The attribute for key [$key] is not an array.");
        Assert::assertContains($value, $attribute);
        
        return $this;
    }
    
    /**
     * Assert that the Vue component's attribute at the given key
     * is an array that does not contain the given value.
     *
     * @param string $key
     * @param string $value
     * @param string|null $componentSelector
     * @return $this
     */
    public function assertVueDoesNotContain($key, $value, $componentSelector = null)
    {
        $attribute = $this->vueAttribute($componentSelector, $key);
        
        Assert::assertIsArray($attribute, "The attribute for key [$key] is not an array.");
        Assert::assertNotContains($value, $attribute);
        
        return $this;
    }
    
    /**
     * Retrieve the value of the Vue component's attribute at the given key.
     *
     * @param string $componentSelector
     * @param string $key
     * @return mixed
     */
    public function vueAttribute($componentSelector, $key)
    {
        $fullSelector = $this->resolver->format($componentSelector);
        
        return $this->driver->executeScript(
            "var el = document.querySelector('" . $fullSelector . "');" .
            "return typeof el.__vue__ === 'undefined' " .
            '? JSON.parse(JSON.stringify(el.__vueParentComponent.ctx)).' . $key .
            ': el.__vue__.' . $key
        );
    }
    
    /**
     * Assert that the given JavaScript expression evaluates to the given value.
     *
     * @param string $expression
     * @param mixed $expected
     * @return $this
     */
    public function assertScript($expression, $expected = true)
    {
        Assert::assertEquals(
            $expected, $this->page->evaluateRaw($expression),
            "JavaScript expression [{$expression}] mismatched."
        );
        
        return $this;
    }
    
}