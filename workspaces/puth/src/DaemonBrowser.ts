import { createBrowser } from './Browser';

class DaemonBrowserSingleton {
  private instance: any;

  async getBrowser(options?) {
    if (!this.instance) {
      this.instance = await createBrowser({
        launchOptions: {
          headless: false,
          ...options,
        },
        args: ['--no-sandbox'],
      });
    }

    return this.instance.browser;
  }

  async cleanup() {
    if (this.instance) {
      await this.instance.browser.close();
      await this.instance.browserCleanup();
    }
  }
}

export const DaemonBrowser = new DaemonBrowserSingleton();
