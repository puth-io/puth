import Puth, {usableBrowserInstallations, makeLogger, PuthStandardPlugin, LiveViewContextPlugin, LiveViewSnapshotPlugin, allBrowserInstallations, unusableBrowserInstallations} from '../';

const stringifyBrowsers = browsers => browsers.map(i => `${i.browser} ${i.buildId} (${i.platform})`).join(', ');

const logger = makeLogger(true);
logger.info(`All browsers: ${stringifyBrowsers(allBrowserInstallations)}`);
logger.info(`Unusable browsers: ${stringifyBrowsers(unusableBrowserInstallations)}`);
logger.info(`Usable browsers: ${stringifyBrowsers(usableBrowserInstallations)}`);

if (usableBrowserInstallations.length === 0) {
    logger.error('No usable browser installation found. Please install one.');
}

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
