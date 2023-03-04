<?php

namespace Puth\Laravel\Browser\Concerns;

use Exception;
use Illuminate\Support\Arr;
use PHPUnit\Framework\Assert;
use Puth\GenericObject;
use Puth\Traits\PuthAssertions;
use Puth\Traits\PuthUtils;

trait MakesAssertions
{
    use PuthAssertions;
    use PuthUtils;
    
    /**
     * Indicates the browser has made an assertion about the source code of the page.
     *
     * @var bool
     */
    public $madeSourceAssertion = false;
    
    /**
     * Assert that the page title is the given value.
     *
     * @param string $title
     * @return $this
     */
    public function assertTitle($title)
    {
        Assert::assertEquals(
            $title, $this->puthPage->title(),
            "Expected title [{$title}] does not equal actual title [{$this->puthPage->title()}]."
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
            strpos($this->puthPage->title(), $title) !== false,
            "Did not see expected value [{$title}] within title [{$this->puthPage->title()}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given encrypted cookie is present.
     *
     * @param string $name
     * @param bool $decrypt
     * @return $this
     */
    public function assertHasCookie($name, $decrypt = true)
    {
        $cookie = $decrypt ? $this->cookie($name) : $this->plainCookie($name);
        
        Assert::assertTrue(
            !is_null($cookie),
            "Did not find expected cookie [{$name}]."
        );
        
        return $this;
    }
    
     /**
      * Assert that the given unencrypted cookie is present.
      *
      * @param string $name
      * @return $this
      */
     public function assertHasPlainCookie($name)
     {
         return $this->assertHasCookie($name, false);
     }
    
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
    public function assertCookieValue($name, $value, $decrypt = true)
    {
        $actual = $decrypt ? $this->cookie($name) : $this->plainCookie($name);
        
        Assert::assertEquals(
            $value, $actual,
            "Cookie [{$name}] had value [{$actual}], but expected [{$value}]."
        );
        
        return $this;
    }
    
     /**
      * Assert that an unencrypted cookie has a given value.
      *
      * @param string $name
      * @param string $value
      * @return $this
      */
     public function assertPlainCookieValue($name, $value)
     {
         return $this->assertCookieValue($name, $value, false);
     }
    
    /**
     * Assert that the given text appears on the page.
     *
     * @param string $text
     * @return $this
     */
    public function assertSee($text)
    {
        return $this->assertSeeIn('', $text);
    }
    
    /**
     * Assert that the given text does not appear on the page.
     *
     * @param string $text
     * @return $this
     */
    public function assertDontSee($text)
    {
        return $this->assertDontSeeIn('', $text);
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
        $fullSelector = $this->resolver->format($selector);
    
        $element = $this->resolver->findOrFail($selector);
    
        try {
            // TODO implement retry safe "notContains" function or maybe provide ['negate' => true]?
            $result = $element->contains($text, ['timeout' => 0]);
        } catch (\Exception $exception) {
        };
        
        Assert::assertNotEmpty(
            $result ?? [],
            "Did not see expected text [{$text}] within element [{$fullSelector}].",
        );
    
        return $this;
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
        $fullSelector = $this->resolver->format($selector);
    
        $element = $this->resolver->findOrFail($selector);
    
        try {
            // TODO implement retry safe "notContains" function or maybe provide ['negate' => true]?
            $result = $element->contains($text, ['timeout' => 0]);
        } catch (\Exception $exception) {
        };
    
        Assert::assertEmpty(
            $result ?? [],
            "Saw unexpected text [{$text}] within element [{$fullSelector}].",
        );
    
        return $this;
    }
    
    /**
     * Assert that any text is present within the selector.
     *
     * @param  string  $selector
     * @return $this
     */
    public function assertSeeAnythingIn($selector)
    {
        $fullSelector = $this->resolver->format($selector);
        
        $element = $this->resolver->findOrFail($selector);
        
        Assert::assertTrue(
            $element->innerText !== '',
            "Saw unexpected text [''] within element [{$fullSelector}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given source code is present on the page.
     *
     * @param string $code
     * @return $this
     */
    public function assertSourceHas($code)
    {
        $this->madeSourceAssertion = true;
        
        Assert::assertTrue(
            strpos($this->puthPage->content(), $code) !== false,
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
        $this->madeSourceAssertion = true;
        
        Assert::assertFalse(
            strpos($this->puthPage->content(), $code) !== false,
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
        return $this->puthPage->visible($selector);
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
     * @param string $element
     * @return string
     */
    public function inputValue($field)
    {
        $element = $this->resolver->resolveForTyping($field);
        
        return $element->value();
    }
    
    /**
     * Assert that the given checkbox field is checked.
     *
     * @return $this
     */
    public function assertChecked($field, $value = null)
    {
        $element = $this->resolver->resolveForChecking($field, $value);
        
        Assert::assertTrue(
            $element->checked,
            "Expected checkbox [{$element}] to be checked, but it wasn't."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given checkbox field is not checked.
     *
     * @return $this
     */
    public function assertNotChecked($field, $value = null)
    {
        $element = $this->resolver->resolveForChecking($field, $value);
        
        Assert::assertFalse(
            $element->checked,
            "Checkbox [{$element}] was unexpectedly checked."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given radio field is selected.
     *
     * @param  string  $field
     * @param  string  $value
     * @return $this
     */
    public function assertRadioSelected($field, $value)
    {
        $element = $this->resolver->resolveForRadioSelection($field, $value);
        
        Assert::assertTrue(
            $element->checked,
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
    public function assertRadioNotSelected($field, $value = null)
    {
        $element = $this->resolver->resolveForRadioSelection($field, $value);
        
        Assert::assertFalse(
            $element->checked,
            "Radio [{$element}] was unexpectedly selected."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given select field has the given value selected.
     *
     * @param string|GenericObject $field
     * @param array|string $value
     * @return $this
     */
    public function assertSelected($field, $value)
    {
        $value = Arr::wrap($value);
        
        Assert::assertTrue(
            $this->selected($field, $value),
            "Expected value [" . implode(',', $value) . "] to be selected for [{$field}], but it wasn't."
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
        $value = Arr::wrap($value);
        
        Assert::assertFalse(
            $this->selected($field, $value),
            "Unexpected value [" . implode(',', $value) . "] selected for [{$field}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given array of values are available to be selected.
     *
     * @param string $field
     * @param mixed $values
     * @return $this
     */
    public function assertSelectHasOptions($field, array $values)
    {
        $options = $this->resolver->resolveSelectOptions($field, $values);
    
        $options = collect($options)->unique(function ($option) {
            return $option->value;
        })->all();
    
        Assert::assertCount(
            count($values),
            $options,
            'Expected options ['.implode(',', $values)."] for selection field [{$field}] to be available."
        );
        
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
     * @param string $field
     * @param string|array $value
     * @return bool
     */
    public function selected($field, $value)
    {
        $selected = $this->resolver->resolveForSelection($field)?->selected();
        
        return !array_diff(Arr::wrap($value), $selected);
    }
    
    /**
     * Assert that the element at the given selector has the given value.
     *
     * @param string $element
     * @param string $value
     * @return $this
     */
    public function assertValue($selector, $value)
    {
        $fullSelector = $this->resolver->format($selector);
    
        $this->ensureElementSupportsValueAttribute(
            $element = $this->resolver->findOrFail($selector),
            $fullSelector
        );
    
        $actual = $element->value;
    
        Assert::assertEquals(
            $value,
            $actual,
            "Did not see expected value [{$value}] within element [{$fullSelector}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the element matching the given selector does not have the given value.
     *
     * @param  string  $selector
     * @param  string  $value
     * @return $this
     */
    public function assertValueIsNot($selector, $value)
    {
        $fullSelector = $this->resolver->format($selector);
        
        $this->ensureElementSupportsValueAttribute(
            $element = $this->resolver->findOrFail($selector),
            $fullSelector
        );
        
        $actual = $element->value;
        
        Assert::assertNotEquals(
            $value,
            $actual,
            "Saw unexpected value [{$value}] within element [{$fullSelector}]."
        );
        
        return $this;
    }
    
    /**
     * Ensure the given element supports the 'value' attribute.
     *
     * @param  mixed  $element
     * @param  string  $fullSelector
     * @return void
     */
    public function ensureElementSupportsValueAttribute($element, $fullSelector)
    {
        Assert::assertTrue(in_array(strtolower($element->tagName), [
            'textarea',
            'select',
            'button',
            'input',
            'li',
            'meter',
            'option',
            'param',
            'progress',
        ]), "This assertion cannot be used with the element [{$fullSelector}].");
    }
    
    /**
     * Assert that the element at the given selector has the given attribute value.
     *
     * @param string $selector
     * @param string $attribute
     * @param string $value
     * @return $this
     */
    public function assertAttribute($selector, $attribute, $value)
    {
        $fullSelector = $this->resolver->format($selector);
        
        $actual = $this->resolver->findOrFail($selector)->its($attribute);
        
        Assert::assertNotNull(
            $actual,
            "Did not see expected attribute [{$attribute}] within element [{$fullSelector}]."
        );
        
        Assert::assertEquals(
            $value, $actual,
            "Expected '$attribute' attribute [{$value}] does not equal actual value [$actual]."
        );
        
        return $this;
    }
    
    /**
     * Assert that the element matching the given selector contains the given value in the provided attribute.
     *
     * @param  string  $selector
     * @param  string  $attribute
     * @param  string  $value
     * @return $this
     */
    public function assertAttributeContains($selector, $attribute, $value)
    {
        $fullSelector = $this->resolver->format($selector);
        
        $actual = $this->resolver->findOrFail($selector)->its($attribute);
        
        Assert::assertNotNull(
            $actual,
            "Did not see expected attribute [{$attribute}] within element [{$fullSelector}]."
        );
    
        Assert::assertStringContainsString(
            $value,
            $actual,
            "Attribute '$attribute' does not contain [{$value}]. Full attribute value was [$actual]."
        );
        
        return $this;
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
     * Assert that the given element or selector is visible.
     *
     * @param string $selector
     * @return $this
     */
    public function assertVisible($selector)
    {
        $fullSelector = $this->resolver->format($selector);
        
        Assert::assertTrue(
            $this->puthPage->visible($this->resolver->format($selector)),
            "Element [{$fullSelector}] is not visible."
        );
        
        return $this;
    }
    
    /**
     * Assert that the element with the given selector is present in the DOM.
     *
     * @param string $element
     * @return $this
     */
    public function assertPresent($selector)
    {
        $fullSelector = $this->resolver->format($selector);
        
        Assert::assertNotNull(
            $this->resolver->find($selector),
            "Element [{$fullSelector}] is not present."
        );
        
        return $this;
    }
    
    /**
     * Assert that the element matching the given selector is not present in the source.
     *
     * @param  string  $selector
     * @return $this
     */
    public function assertNotPresent($selector)
    {
        $fullSelector = $this->resolver->format($selector);
        
        Assert::assertNull(
            $this->resolver->find($selector),
            "Element [{$fullSelector}] is present."
        );
        
        return $this;
    }
    
    /**
     * Assert that the element with the given selector is not on the page.
     *
     * @param string $selector
     * @return $this
     */
    public function assertMissing($selector)
    {
        $fullSelector = $this->resolver->format($selector);
    
        try {
            // TODO improve assertions with waits
//            $this->puthPage->waitForSelector($fullSelector, ['hidden' => true]);
            $this->resolver->findOrFail($selector);
    
            $missing = false;
        } catch (Exception $e) {
            $missing = true;
        }
    
        Assert::assertTrue(
            $missing,
            "Saw unexpected element [{$fullSelector}]."
        );
        
        return $this;
    }
    
    /**
     * Assert that a JavaScript dialog with given message has been opened.
     * @param string $message
     * @return $this
     */
     public function assertDialogOpened($message)
     {
         $actualMessage = $this->puthPage->waitForDialog()?->message();
    
         Assert::assertEquals(
             $message, $actualMessage,
             "Expected dialog message [{$message}] does not equal actual message [{$actualMessage}]."
         );
    
         return $this;
     }
    
    /**
     * Assert that the given field is enabled.
     *
     * @param string|GenericObject $field
     * @return $this
     */
    public function assertEnabled($field)
    {
        $element = $this->resolver->resolveForField($field);
        
        Assert::assertFalse(
            $element->disabled,
            "Expected element [{$element}] to be enabled, but it wasn't."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given field is disabled.
     *
     * @param string|GenericObject $field
     * @return $this
     */
    public function assertDisabled($field)
    {
        $element = $this->resolver->resolveForField($field);
        
        Assert::assertTrue(
            $element->disabled,
            "Expected element [{$element}] to be disabled, but it wasn't."
        );
        
        return $this;
    }
    
    /**
     * Assert that the given button is enabled.
     *
     * @param string|GenericObject $button
     * @return $this
     */
    public function assertButtonEnabled($button)
    {
        $element = $this->resolver->resolveForButtonPress($button);
    
        Assert::assertFalse(
            $element->disabled,
            "Expected button [{$button}] to be enabled, but it wasn't."
        );
    
        return $this;
    }
    
    /**
     * Assert that the given button is disabled.
     *
     * @param string $button
     * @return $this
     */
    public function assertButtonDisabled($button)
    {
        $element = $this->resolver->resolveForButtonPress($button);
    
        Assert::assertTrue(
            $element->disabled,
            "Expected button [{$button}] to be disabled, but it wasn't."
        );
    
        return $this;
    }
    
    /**
     * Assert that the given field is focused.
     *
     * @param string $field
     * @return $this
     */
    public function assertFocused($field)
    {
        $element = $this->resolver->resolveForField($field);
        
        $this->assertElementEquals($this->puthPage->focused(), $element);
        
        return $this;
    }
    
    /**
     * Assert that the given field is not focused.
     *
     * @param string $field
     * @return $this
     */
    public function assertNotFocused($field)
    {
        $element = $this->resolver->resolveForField($field);
        
        $this->assertElementNotEquals($this->puthPage->focused(), $element);
        
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
        
        return $this->puthPage->evaluate(
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
            $expected, $this->puthPage->evaluate($expression),
            "JavaScript expression [{$expression}] mismatched."
        );
        
        return $this;
    }
    
}