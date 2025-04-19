<?php

namespace Puth\Proxies;

use Puth\RemoteObject;

class FileChooser extends RemoteObject
{
    public function accept($filePaths)
    {
        $tmpFilePaths = [];
        foreach ($filePaths as $path) {
            $tmpFilePaths[] = $this->context->saveTemporaryFile(basename($path), file_get_contents($path));
        }
        
        return $this->call('accept', [$tmpFilePaths]);
    }
    
    public function cancel()
    {
        return $this->call('cancel');
    }
    
    public function isMultiple()
    {
        return $this->call('isMultiple');
    }
}
