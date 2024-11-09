<?php

namespace Puth\Laravel\Concerns;

use Puth\Laravel\Browser;
use PHPUnit\Framework\Assert;

/**
 * This file is a direct copy or contains substantial parts of the Laravel/Dusk
 * code which is covered by the MIT license below. However, modified parts are
 * covered by the Puth license.
 * Source: https://github.com/laravel/dusk/blob/7.x/src/Concerns/InteractsWithAuthentication.php
 *
 * The MIT License (MIT)
 *
 * Copyright (c) Taylor Otwell
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
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
        
        return json_decode(strip_tags($response->site->content()), true);
    }
    
    /**
     * Assert that the user is authenticated.
     *
     * @param string|null $guard
     * @return $this
     */
    public function assertAuthenticated($guard = null)
    {
        $currentUrl = $this->site->url();
        
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
        $currentUrl = $this->site->url();
    
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
        $currentUrl = $this->site->url();
        
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
