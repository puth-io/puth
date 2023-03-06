<?php

namespace Puth\Proxies;

use Puth\GenericObject;

class FileChooser extends GenericObject
{
    public function accept($filePaths)
    {
        $tmpFilePaths = [];
        foreach ($filePaths as $path) {
            $tmpFilePaths[] = $this->context->saveTemporaryFile(basename($path), file_get_contents($path));
        }
        
        return $this->callMethod('accept', [$tmpFilePaths]);
    }
    
    public function cancel()
    {
        return $this->callMethod('cancel');
    }
    
    public function isMultiple()
    {
        return $this->callMethod('isMultiple');
    }
}