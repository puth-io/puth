# Dusk rewrite

## Browser shim
- only Page has dialog events, dialog functions need to resolve to the "mainFrame" and check if it's blocked

## JS Server
- faster snapshots
- extension dynamic tests
- return resolver as plugin (like extension)
- finish highlight implementation
    - send in snapshot what it should be highlightet with (overlay, click, ...)
    - server side object highlight strategies (Page, $ -> strategy)
- snapshot with iframe content (also selector inside iframe)
