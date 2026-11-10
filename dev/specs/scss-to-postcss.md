# Migrate all SCSS to PostCSS

Remove Sass from the repository. The GUI already runs every stylesheet through
PostCSS (`tailwindcss`, `autoprefixer`, `postcss-nesting`,
`postcss-overflow-shorthand`), so Sass is a second compiler for two files.

## Today

Two SCSS files exist, both in `workspaces/gui`:

| File | Lines | Sass features | Used |
| --- | --- | --- | --- |
| `src/app/colors.scss` | 96 | variables, nesting, `//` comments | Not imported anywhere. It styles Bootstrap classes (`.btn.btn-primary`, `.alert`, `.bg-lighter`) that the GUI no longer uses. |
| `src/app/components/Dropzone/Dropzone.scss` | 33 | one nested `&.active` | Imported by `Dropzone.tsx`. |

`sass` is a devDependency of `@puth/gui` only. The docs theme, the Laravel test
application and the fixtures have no SCSS.

## Work

- [x] Delete `colors.scss`. Before that, confirm with a build that nothing
  resolves it and that none of its class names appear in `src/`.
- [x] Rename `Dropzone.scss` to `Dropzone.css` and update the import in
  `Dropzone.tsx`. `&.active` is valid for `postcss-nesting` as written.
- [x] Remove `sass` from `workspaces/gui/package.json` and update
  `package-lock.json`.

The `prism-sass` and `prism-scss` imports in `Code.tsx` are syntax highlighting
for recorded code and stay.

Converting the dropzone to Tailwind classes is not part of this. It would change
markup for no gain, and the two rules are easier to read as CSS.

## Acceptance

- `git ls-files | grep -E '\.s[ac]ss$'` finds nothing, and `sass` is gone from
  `package-lock.json`.
- `npm -w @puth/gui run build` passes.
- The GUI tests in `workspaces/puth/test/gui` pass after a rebuild.
- The dropzone looks the same when a file is dragged over the GUI. Check the
  compiled rule `.dropzone-wrapper.active` in the built CSS.

No Changeset: the built GUI does not change for users.
