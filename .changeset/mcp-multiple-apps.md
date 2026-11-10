---
'@puth/mcp': minor
---

Work with several applications of one repository. `PUTH_APP_URLS="shop=http://shop:8080 admin=http://admin:8080"` names them, the first being the default, and `puth_session_create` takes an `app` name. Relative URLs and Laravel drafts of a session use its application, which a session starting on an absolute URL or taking over a test finds by that page. `PUTH_APP_URL` keeps working as the application `default`. `PUTH_START_HINT` sets the command suggested when no Puth instance answers, `puth start` by default.
