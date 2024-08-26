<?php

namespace Browser;

use App\Models\User;
use Puth\Laravel\Browser\Browser;
use Tests\PuthTestCase;

class ExampleTest extends PuthTestCase
{
    public function test_basic_example(): void
    {
        $user = User::factory()->create([
            'email' => 'taylor@laravel.com',
        ]);
        
        $this->browse(function (Browser $browser) use ($user) {
            $browser->visit('/login')
                ->type('email', $user->email)
                ->type('password', 'password')
                ->press('Login')
                ->assertPathIs('/home');
        });
    }
}


























