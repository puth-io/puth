<?php

namespace Puth\Laravel\Browser\Concerns;

use Puth\Laravel\Browser\Browser;
use PHPUnit\Framework\Assert;

trait InteractsWithAuthentication
{
    /**
     * Log into the application as the default user.
     *
     * @return $this
     */
    public function login()
    {
        return $this->loginAs(call_user_func(Browser::$userResolver));
    }
    
    /**
     * Log into the application using a given user ID or email.
     *
     * @param object|string $userId
     * @param string|null $guard
     * @return $this
     */
    public function loginAs($userId, $guard = null)
    {
        $userId = is_object($userId) && method_exists($userId, 'getKey') ? $userId->getKey() : $userId;
        
        return $this->visit(rtrim(route('puth.dusk.login', ['userId' => $userId, 'guard' => $guard], $this->shouldUseAbsoluteRouteForAuthentication())));
    }
    
    /**
     * Log out of the application.
     *
     * @param string|null $guard
     * @return $this
     */
    public function logout($guard = null)
    {
        return $this->visit(rtrim(route('puth.dusk.logout', ['guard' => $guard], $this->shouldUseAbsoluteRouteForAuthentication()), '/'));
    }
    
    /**
     * Get the ID and the class name of the authenticated user.
     *
     * @param string|null $guard
     * @return array
     */
    protected function currentUserInfo($guard = null)
    {
        $response = $this->visit(route('puth.dusk.user', ['guard' => $guard], $this->shouldUseAbsoluteRouteForAuthentication()));
        
        return json_decode(strip_tags($response->puthPage->content()), true);
    }
    
    /**
     * Assert that the user is authenticated.
     *
     * @param string|null $guard
     * @return $this
     */
    public function assertAuthenticated($guard = null)
    {
        $currentUrl = $this->puthPage->url();
        
        Assert::assertNotEmpty($this->currentUserInfo($guard), 'The user is not authenticated.');
        
        return $this->visit($currentUrl);
    }
    
    /**
     * Assert that the user is not authenticated.
     *
     * @param string|null $guard
     * @return $this
     */
    public function assertGuest($guard = null)
    {
        $currentUrl = $this->puthPage->url();
    
        Assert::assertEmpty(
            $this->currentUserInfo($guard), 'The user is unexpectedly authenticated.'
        );
        
        return $this->visit($currentUrl);
    }
    
    /**
     * Assert that the user is authenticated as the given user.
     *
     * @param mixed $user
     * @param string|null $guard
     * @return $this
     */
    public function assertAuthenticatedAs($user, $guard = null)
    {
        $currentUrl = $this->puthPage->url();
        
        $expected = [
            'id' => $user->getAuthIdentifier(),
            'className' => get_class($user),
        ];
        
        Assert::assertSame(
            $expected, $this->currentUserInfo($guard),
            'The currently authenticated user is not who was expected.'
        );
        
        return $this->visit($currentUrl);
    }
    
    /**
     * Determine if route() should use an absolute path.
     *
     * @return bool
     */
    private function shouldUseAbsoluteRouteForAuthentication()
    {
        return config('puth.dusk.domain', config('dusk.domain')) !== null;
    }
}