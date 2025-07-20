<?php

use App\Mail\TestMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

Route::get('/', function (Request $request) {
    return view('welcome');
});
Route::post('/', function (Request $request) {
    return response()->stream(function() use ($request) {
        echo json_encode([
            'input' => $request->input(),
            'files' => array_map(
                function($file) {
                    if (is_array($file)) {
                        return array_map(fn($f) => [
                            'name' => $f->getFilename(),
                            'size' => $f->getSize(),
                            'content' => base64_encode($f->getContent()),
                        ], $file);
                    }

                    return [
                        'name' => $file->getFilename(),
                        'size' => $file->getSize(),
                        'content' => base64_encode($file->getContent()),
                    ];
                },
                $request->allFiles(),
            ),
        ]);
        ob_flush();
        flush();
    });
});
Route::post('/debug', function (Request $request) {
    dump($request->header());
    dump($request->query());
    dump($request->post());
    dump($request->file());
    dd($request->input());
});

Route::get('/sub/path', function () {
    return response('');
})->name('sub.path');

Route::get('send/mail', function () {
    Mail::to('test@test.localhost')->send(new TestMail());
})->name('send.mail');
