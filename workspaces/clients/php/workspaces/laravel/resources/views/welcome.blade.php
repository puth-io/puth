<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <title>laravel puth testbed</title>
        @vite(['resources/js/app.js'])
    </head>
    <body class="antialiased">
        <div id="app">
            <counter/>
        </div>
    </body>
</html>
