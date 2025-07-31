import {
    Puth,
    usableBrowserInstallations,
    makeLogger,
    PuthStandardPlugin,
    LiveViewContextPlugin,
    LiveViewSnapshotPlugin, unusableBrowserInstallations, allBrowserInstallations,
} from 'puth';

const stringifyBrowsers = browsers  => browsers.map(i => `${i.browser} ${i.buildId} (${i.platform})`).join(', ');

const logger = makeLogger(true);
logger.debug(`All browsers: ${stringifyBrowsers(allBrowserInstallations)}`);
logger.debug(`Unusable browsers: ${stringifyBrowsers(unusableBrowserInstallations)}`);
logger.debug(`Usable browsers: ${stringifyBrowsers(usableBrowserInstallations)}`);

const instance = new Puth({
    debug: true,
    disableCors: true,
    installedBrowser: usableBrowserInstallations[0],
    logger,
});

instance.use(PuthStandardPlugin);
instance.use(LiveViewContextPlugin);
instance.use(LiveViewSnapshotPlugin);

instance.serve(7345, '127.0.0.1');
