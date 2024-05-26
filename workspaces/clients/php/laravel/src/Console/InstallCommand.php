<?php

namespace Puth\Laravel\Console;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\App;

/**
 * This file is a direct copy or contains substantial parts of the Laravel/Dusk
 * code which is covered by the MIT license below.
 * Source: https://github.com/laravel/dusk/blob/7.x/src/Console/InstallCommand.php
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
        
        $stubs = [];
        if (str_starts_with(App::version(), '11')) {
            $stubs['PuthTestCaseLV11.stub'] = base_path('tests/PuthTestCase.php');
        } else {
            $stubs['PuthTestCase.stub'] = base_path('tests/PuthTestCase.php');
        }
        
        foreach ($stubs as $stub => $file) {
            if (!is_file($file)) {
                copy(__DIR__ . '/../../stubs/' . $stub, $file);
            }
        }
        
        $this->call('vendor:publish', ['--provider' => 'Puth\\Laravel\\PuthServiceProvider']);
        
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
