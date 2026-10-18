# Development and tests

Use the root `compose.yml` for the development environment and
`./docker/dev/test.sh` for the active test suites. See [TESTING.md](TESTING.md)
for setup, focused runs, logs, and cleanup.

## Run GitHub Actions locally

Install `act`. Run `dev/act/build.sh`. Now you can use that image with `act -P ubuntu-latest=puth:act-latest`.
