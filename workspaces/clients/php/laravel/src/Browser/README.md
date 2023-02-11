## TODO

### Concerns

- InteractsWithAuthentication
- InteractsWithCookies
- InteractsWithElements
- InteractsWithJavascript
- DONE InteractsWithMouse
- MakesAssertions
- MakesUrlAssertions
- WaitsForElements

### Concepts

- JavaScript Dialogs
- Scoping Selectors
- Waiting For Elements

## Transition from Dusk

The `puth/laravel` package provides an almost complete replacement for Dusk, but there are methods that are not
supported and never will be due to the limitations of the underlying library `puppeteer`.

### Differences

The only difference is that `puth/laravel` does not start the browser process. For that you need to run `puth` (e.g. in 
Docker) and point the client to the instance of `puth`. `puth/laravel` once contained code to start the `puth` process 
but I don't think enough people would use this feature so I removed it.

### Unsupported methods

#### Browser

- `$browser->maximize()`: Puppeteer has no way of controlling the actual browser window
- `$browser->move($x = 100, $y = 100)`: Puppeteer has no way of controlling the actual browser window

#### Mouse
- `moveMouse($xOffset, $yOffset)`: Puppeteer doesn't have an actual mouse therefore you can't move it by an offset. We could track the mouse x and y location but then we need to update it on $page->click, $element->click, ...
- ``: 
- ``: 
- ``: 
- ``: 
- ``: 

### Implementation needed

- `$browser->fitContent()`:
- `$browser->storeConsoleLog('filename')`: There is no exact equivalent for console logs but we can provide better ones
- `$browser->attach('photo', __DIR__.'/photos/mountains.png');`:
- `$browser->keys('selector', ['{shift}', 'taylor'], 'swift');`:
