<?php

namespace Tests\Feature;

use Puth\PuthTestCase;
use Puth\Traits\PuthDuskAssertions;

class PuthDuskAssertionsTest extends PuthTestCase
{
    use PuthDuskAssertions;
    
    protected string $baseUrl = 'https://playground.puth.dev//';
    
    public function testAssertTitle()
    {
        $this->assertTitle('Puth - Playground');
    }
    
    public function testAssertTitleContains()
    {
        $this->assertTitleContains('Playground');
    }
    
    public function testAssertSee()
    {
        $this->assertSee('Welcome to Puths Playground');
    }
    
    public function testAssertDontSee()
    {
        $this->assertDontSee('This text does not exists');
    }
    
    public function testAssertSeeIn()
    {
        $this->assertSeeIn('body', 'Querying');
    }
    
    public function testAssertDontSeeIn()
    {
        $this->assertDontSeeIn('body', 'This text does not exists');
    }
    
    public function testAssertSourceHas()
    {
        $this->assertSourceHas('<title>Puth - Playground</title>');
    }
    
    public function testAssertSourceMissing()
    {
        $this->assertSourceMissing('<div>__not in dom__</div>');
    }
    
    public function testAssertSeeLink()
    {
        $this->assertSeeLink('https://puth.dev');
    }
    
    public function testAssertDontSeeLink()
    {
        $this->assertDontSeeLink('https://notalink.io');
    }
    
    public function testAssertVisible()
    {
        $this->assertVisible('body');
    }
    
    public function testAssertVisibleElement()
    {
        $this->assertVisible($this->page->get('body'));
    }
    
    public function testAssertInputValue()
    {
        $input = $this->page->get('#properties-value input');

        $this->assertInputValue($input, 'input with value');
    }
    
    public function testAssertInputValueIsNot()
    {
        $input = $this->page->get('#properties-value input');
        
        $this->assertInputValueIsNot($input, 'not the correct value');
    }

    // TODO add checkbox to playground
    // public function testAssertChecked()
    // {
    //     $this->page->goto('https://example.cypress.io/commands/actions');
    //
    //     $checkbox = $this->page->get('input[type="checkbox"]');
    //     $checkbox->click();
    //
    //     $this->assertChecked($checkbox);
    // }

    // TODO add checkbox to playground
    // public function testAssertNotChecked()
    // {
    //     $this->page->goto('https://example.cypress.io/commands/actions');
    //
    //     $checkbox = $this->page->get('input[type="checkbox"]');
    //
    //     $this->assertNotChecked($checkbox);
    // }

    // TODO add radio to playground
    // public function testAssertRadioSelected()
    // {
    //     $this->page->goto('https://example.cypress.io/commands/actions');
    //
    //     $radio = $this->page->get('input[type="radio"]');
    //     $radio->click();
    //
    //     $this->assertRadioSelected($radio);
    // }

    // TODO add radio to playground
    // public function testAssertRadioNotSelected()
    // {
    //     $this->page->goto('https://example.cypress.io/commands/actions');
    //
    //     $radio = $this->page->get('input[type="radio"]');
    //
    //     $this->assertRadioNotSelected($radio);
    // }
    
    public function testAssertSelected()
    {
        $select = $this->page->get('#actions-select');
        $select->select('apple');
        
        $this->assertSelected($select, 'apple');
    }
    
    public function testAssertNotSelected()
    {
        $select = $this->page->get('#actions-select');
        $select->select('apple');

        $this->assertNotSelected($select, 'orange');
    }
    
    public function testAssertSelectHasOptions()
    {
        $select = $this->page->get('#actions-select');
        
        $this->assertSelectHasOptions(
            $select,
            [
                'apple',
                'orange',
            ]
        );
    }
    
    public function testAssertSelectMissingOptions()
    {
        // $this->page->goto('https://example.cypress.io/commands/actions');
        // TODO assertSelectMissingOptions
    }
    
    public function testAssertSelectHasOption()
    {
        $this->assertSelectHasOptions(
            $this->page->get('#actions-select'),
            'orange'
        );
    }
    
    public function testAssertSelectMissingOption()
    {
        // $this->page->goto('https://example.cypress.io/commands/actions');
        // TODO assertSelectMissingOption
    }
    
    public function testAssertAttribute()
    {
        $this->assertAttribute(
            $this->page->get('.navbar img'),
            'width',
            '28'
        );
    }
    
    public function testAssertDataAttribute() {
        // TODO implement
    }
    
    public function testAssertAriaAttribute() {
        // TODO implement
    }
    
    public function testAssertPresent() {
        $this->assertPresent('body');
    }
    
    public function testAssertMissing() {
        $this->assertMissing('missingelement');
    }
    
    public function testDialogOpened() {
        // TODO implement
    }
    
    public function testAssertEnabled() {
        $this->assertEnabled($this->page->get('#actions-focus'));
    }

    // TODO add disable element to playground
    // public function testAssertDisabled() {
    //
    //     $this->assertDisabled($this->page->get('input[disabled]'));
    // }
    
    public function testAssertButtonEnabled() {
        // TODO write test
    }
    
    public function testAssertButtonDisabled() {
        // TODO write test
    }
    
    public function testAssertFocused() {
        $this->page->goto('https://playground.puth.dev');

        $el = $this->page->get('#actions-focus');
        $el->click();

        $this->assertFocused($el);
    }
    
    public function testAssertNotFocused() {
        $this->page->goto('https://playground.puth.dev');

        $el = $this->page->get('#actions-focus');
        $el->click();

        $this->page->get('#actions-type input')->click();

        $this->assertNotFocused($el);
    }
    
    public function testAssertScript() {
        $this->assertScript('1+1', 2);
    }
}