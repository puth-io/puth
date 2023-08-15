<?php

namespace Puth\Laravel\Console;

use Illuminate\Console\Command;

class InstallCommand extends Command
{
    protected $signature = 'puth:install';
    
    protected $description = 'Install Puth into the application';
    
    public function handle()
    {
        if (!is_dir(base_path('tests/Browser/Pages'))) {
            mkdir(base_path('tests/Browser/Pages'), 0755, true);
        }
        
        if (!is_dir(base_path('tests/Browser/Components'))) {
            mkdir(base_path('tests/Browser/Components'), 0755, true);
        }
        
        if (!is_dir(base_path('tests/Browser/screenshots'))) {
            $this->createScreenshotsDirectory();
        }
        
        if (!is_dir(base_path('tests/Browser/console'))) {
            $this->createConsoleDirectory();
        }
        
        if (!is_dir(base_path('tests/Browser/source'))) {
            $this->createSourceDirectory();
        }
        
        $stubs = [
            'PuthTestCase.stub' => base_path('tests/PuthTestCase.php'),
        ];
        
        foreach ($stubs as $stub => $file) {
            if (!is_file($file)) {
                copy(__DIR__ . '/../../stubs/' . $stub, $file);
            }
        }
        
        $this->info('Puth installed successfully.');
    }
    
    protected function createScreenshotsDirectory()
    {
        mkdir(base_path('tests/Browser/screenshots'), 0755, true);
        file_put_contents(base_path('tests/Browser/screenshots/.gitignore'), '*
!.gitignore
');
    }
    
    protected function createConsoleDirectory()
    {
        mkdir(base_path('tests/Browser/console'), 0755, true);
        file_put_contents(base_path('tests/Browser/console/.gitignore'), '*
!.gitignore
');
    }
    
    protected function createSourceDirectory()
    {
        mkdir(base_path('tests/Browser/source'), 0755, true);
        file_put_contents(base_path('tests/Browser/source/.gitignore'), '*
!.gitignore
');
    }
}
