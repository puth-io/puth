<?php

namespace Puth\Laravel;

use Illuminate\Contracts\Foundation\Application;
use Illuminate\Log\Events\MessageLogged;
use Illuminate\Support\Facades\Log;
use Monolog\Formatter\LineFormatter;

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
            
            $this->logEventsCaptured[] = [
                'level_name' => strtoupper($event->level),
                'channel' => config('app.env'),
                'message' => $event->message,
                'context' => $event->context,
                'extra' => [],
                'datetime' => now(),
            ];
        });
    }
    
    public function getFormattedLog()
    {
        $formatter = new LineFormatter(null, 'Y-m-d H:i:s', true, true);
        $formatter->includeStacktraces();
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
    }
    
    public function instanceUrl()
    {
        return $this->app['config']['puth']['instance']['url'];
    }
}
