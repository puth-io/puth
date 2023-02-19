<?php

namespace Puth\Laravel;

use Illuminate\Contracts\Foundation\Application;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\Log;

class PuthManager
{
    /**
     * The application instance.
     *
     * @var Application
     */
    protected $app;
    
    private bool $captureLog = false;
    
    private array $logEventsCaptured = [];
    
    /**
     * Create a new Log manager instance.
     *
     * @param Application $app
     * @return void
     */
    public function __construct($app)
    {
        $this->app = $app;
        
        Log::listen(function (MessageLogged $event) {
            if (!$this->captureLog) {
                return;
            }
            
            $this->logEventsCaptured[] = $event;
        });
    }
    
    public function getFormattedLog()
    {
        return array_map(
            function (MessageLogged $event)  {
                $context = array_map(function ($item) {
                    if (is_object($item)) {
                        return get_class($item) . '::class';
                    }    
                    
                    return $item;
                }, $event->context);
                
                return [
                    'level' => $event->level,
                    'message' => $event->message,
                    'context' => $context,
                ];
            },
            $this->logEventsCaptured,
        );
    }
    
    public function clearLog()
    {
        $this->logEventsCaptured = [];
    }
    
    public function captureLog()
    {
        $this->captureLog = true;
    }
    
    public function releaseLog()
    {
        $this->captureLog = false;
    
        $this->clearLog();
    }
    
    public function instanceUrl()
    {
        return $this->app['config']['puth']['instance']['url'];
    }
}