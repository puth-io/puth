<?php

namespace Puth\Laravel;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class PuthServiceProvider extends ServiceProvider
{
    /**
     * Bootstrap any package services.
     *
     * @return void
     */
    public function boot()
    {
        $this->publishes([
            __DIR__.'/../config/puth.php' => config_path('puth.php'),
        ]);
        
        if (! $this->app->environment('production')) {
            Route::group(array_filter([
                'prefix' => config('dusk.path', config('puth.dusk.path', '_dusk')),
                'domain' => config('dusk.domain', config('puth.dusk.domain', null)),
                'middleware' => config('dusk.middleware', config('puth.dusk.middleware', 'web')),
            ]), function () {
                Route::get('/login/{userId}/{guard?}', [
                    'uses' => 'Puth\Laravel\Http\Controllers\UserController@login',
                    'as' => 'puth.dusk.login',
                ]);
                
                Route::get('/logout/{guard?}', [
                    'uses' => 'Puth\Laravel\Http\Controllers\UserController@logout',
                    'as' => 'puth.dusk.logout',
                ]);
                
                Route::get('/user/{guard?}', [
                    'uses' => 'Puth\Laravel\Http\Controllers\UserController@user',
                    'as' => 'puth.dusk.user',
                ]);
            });
        }
    }
    
    public function register()
    {
        $this->app->singleton('puth', function ($app) {
            return new PuthManager($app);
        });
    }
}