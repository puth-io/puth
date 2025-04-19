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
        
        return $this->callFunc('accept', [$tmpFilePaths]);
    }
    
    public function cancel()
    {
        return $this->callFunc('cancel');
    }
    
    public function isMultiple()
    {
        return $this->callFunc('isMultiple');
    }
}
