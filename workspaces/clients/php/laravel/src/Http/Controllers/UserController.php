<?php

namespace Puth\Laravel\Http\Controllers;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Str;

/**
 * This file is a direct copy or contains substantial parts of the Laravel/Dusk
 * code which is covered by the MIT license below.
 * Source: https://github.com/laravel/dusk/blob/7.x/src/Http/Controllers/UserController.php
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
class UserController
{
    /**
     * Retrieve the authenticated user identifier and class name.
     *
     * @param string|null $guard
     * @return array
     */
    public function user($guard = null)
    {
        $user = Auth::guard($guard)->user();
        
        if (!$user) {
            return [];
        }
        
        return [
            'id' => $user->getAuthIdentifier(),
            'className' => get_class($user),
        ];
    }
    
    /**
     * Login using the given user ID / email.
     *
     * @param string $userId
     * @param string|null $guard
     * @return void
     */
    public function login($userId, $guard = null)
    {
        $guard = $guard ?: config('auth.defaults.guard');
        
        $provider = Auth::guard($guard)->getProvider();
        
        $user = Str::contains($userId, '@')
            ? $provider->retrieveByCredentials(['email' => $userId])
            : $provider->retrieveById($userId);
        
        Auth::guard($guard)->login($user);
    }
    
    /**
     * Log the user out of the application.
     *
     * @param string|null $guard
     * @return void
     */
    public function logout($guard = null)
    {
        $guard = $guard ?: config('auth.defaults.guard');
        
        Auth::guard($guard)->logout();
        
        Session::forget('password_hash_' . $guard);
    }
    
    /**
     * Get the model for the given guard.
     *
     * @param string $guard
     * @return string
     */
    protected function modelForGuard($guard)
    {
        $provider = config("auth.guards.{$guard}.provider");
        
        return config("auth.providers.{$provider}.model");
    }
}
