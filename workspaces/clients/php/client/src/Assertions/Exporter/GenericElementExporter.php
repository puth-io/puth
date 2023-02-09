<?php

namespace Puth\Assertions\Exporter;

use SebastianBergmann\Exporter\Exporter;

class GenericElementExporter extends Exporter {
    public function export($value, $indentation = 0)
    {
        return strval($value);
    }
}