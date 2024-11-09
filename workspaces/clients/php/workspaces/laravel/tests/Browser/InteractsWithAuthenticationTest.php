<?php

namespace Tests\Browser;

use App\Models\User;
use Puth\Laravel\Browser;
use Tests\PuthTestCase;

class InteractsWithAuthenticationTest extends PuthTestCase
{
    function test_user_resolver()
    {
        $this->browse(function (Browser $browser) {
            $browser->visit('/')
                ->login()
                ->assertAuthenticated();
        });
    }
    
    function test_login()
    {
        $user = User::factory()->create();
        
        $this->browse(function (Browser $browser) use ($user) {
            $browser->visit('/')
                ->loginAs($user)
                ->assertAuthenticatedAs($user);
        });
    }
    
    function test_logout()
    {
        $user = User::factory()->create();
        
        $this->browse(function (Browser $browser) use ($user) {
            $browser->visit('/')
                ->loginAs($user)
                ->assertAuthenticated()
                ->logout()
                ->assertGuest();
        });
    }
    
    protected function user()
    {
        return User::factory()->create();
    }
}
