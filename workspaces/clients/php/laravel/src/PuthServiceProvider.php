<?php

namespace Puth\Laravel;

use Illuminate\Support\ServiceProvider;

class PuthServiceProvider extends ServiceProvider
{
    public function register()
    {
        $this->app->singleton('puth', function ($app) {
            return new PuthManager($app);
        });
    }
}