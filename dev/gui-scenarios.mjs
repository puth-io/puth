// Records test runs with different outcomes on a Puth instance, so the GUI has something to show.
// Every page comes from setContent, nothing is loaded from a server.
//
//   docker compose run --rm --no-deps -e PUTH_URL=http://puth:7345 node-test node dev/gui-scenarios.mjs
//
// Then open the GUI (`docker compose up -d gui`, http://localhost:5173) and connect to
// ws://127.0.0.1:7345/websocket. Runs are kept by the instance until it restarts.

import { Context, RemotePuthClient } from '@puth/client';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const instanceUrl = (process.env.PUTH_URL ?? 'http://127.0.0.1:7345').replace(/\/$/, '');
const client = new RemotePuthClient(instanceUrl);

const page = (title, body, script = '') => `<!doctype html>
<html><head><title>${title}</title><style>
body { font-family: Arial, 'Liberation Sans', system-ui, sans-serif; margin: 0; background: #f1f5f9; color: #0f172a; }
header { height: 52px; display: flex; align-items: center; padding: 0 24px; background: #fff; border-bottom: 1px solid #e2e8f0; font-weight: 600; }
main { display: flex; justify-content: center; padding: 48px 16px; }
.card { width: 340px; background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; display: flex; flex-direction: column; gap: 12px; }
label { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: #475569; }
input, select { height: 34px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 0 10px; font: inherit; }
h2 { font-weight: 600; }
button { height: 36px; border: 0; border-radius: 6px; background: #0f172a; color: #fff; font: inherit; cursor: pointer; }
.error { display: flex; align-items: center; justify-content: center; gap: 18px; height: 100vh; background: #141417; color: #a1a1aa; font-size: 18px; letter-spacing: .04em; }
.error span:first-child { padding-right: 18px; border-right: 1px solid #3f3f46; }
</style></head><body><header>Playground</header>${body}<script>${script}</script></body></html>`;

const loginPage = (fails) => page('Log in', `
<main><form class="card" onsubmit="return false">
  <h2 style="margin:0">Log in</h2>
  <label>Email <input id="email" type="email"></label>
  <label>Password <input id="password" type="password"></label>
  <button id="submit">Log in</button>
</form></main>`, `
document.getElementById('submit').addEventListener('click', () => {
  ${fails
    ? `console.error('POST /login 500 (Internal Server Error)');
  document.body.style.background = '#141417';
  document.body.innerHTML = '<div class="error"><span>500</span><span>SERVER ERROR</span></div>';`
    : `document.querySelector('main').innerHTML = '<div class="card"><h2 style="margin:0">Dashboard</h2><p>Welcome back, Ada.</p><button id="logout">Log out</button></div>';
  document.getElementById('logout').addEventListener('click', () => { document.querySelector('main').innerHTML = '<div class="card"><a href="#">Log in</a></div>'; });`}
});`);

const checkoutPage = page('Checkout', `
<main><div class="card">
  <h2 style="margin:0">Checkout</h2>
  <div>Subtotal <b id="subtotal">€ 48.00</b></div>
  <label>Coupon <input id="coupon"></label>
  <button id="apply">Apply</button>
  <div id="total">Total € 48.00</div>
</div></main>`, `
console.warn('Deprecated: window.cart will be removed in 3.0');
document.getElementById('apply').addEventListener('click', () => {
  console.log('Applying coupon', document.getElementById('coupon').value);
  setTimeout(() => { document.getElementById('total').textContent = 'Total € 38.40'; }, 1500);
});`);

const brokenCheckoutPage = page('Checkout', `
<main><div class="card">
  <h2 style="margin:0">Checkout</h2>
  <div id="total">Total € …</div>
  <button id="pay">Pay now</button>
</div></main>`, `
console.info('Loading prices');
setTimeout(() => { throw new TypeError("Cannot read properties of undefined (reading 'amount')"); }, 50);
document.getElementById('pay').addEventListener('click', () => console.error('Payment provider is not configured'));`);

const profilePage = page('Profile', `
<main><form class="card" onsubmit="return false">
  <h2 style="margin:0">Profile</h2>
  <label>First name <input id="first"></label>
  <label>Last name <input id="last"></label>
  <label>Email <input id="email"></label>
  <label>Phone <input id="phone"></label>
  <label>City <input id="city"></label>
  <label>Country <select id="country"><option value="at">Austria</option><option value="de">Germany</option><option value="ch">Switzerland</option></select></label>
  <label style="flex-direction:row;align-items:center"><input id="newsletter" type="checkbox" style="height:auto"> Newsletter</label>
  <button id="save">Save</button>
  <div id="status"></div>
</form></main>`, `
document.getElementById('save').addEventListener('click', () => { document.getElementById('status').textContent = 'Saved'; });`);

async function run(name, group, steps, {finish = true} = {}) {
    const context = await Context.create(client, { snapshot: true, test: { name }, group });
    const browser = await context.createBrowserShim();
    await browser.resize(1280, 720);
    let failed = false;

    try {
        await steps(browser);
    } catch (error) {
        failed = true;
        console.log(`  ✕ ${name}: ${error.message.split('\n')[0]}`);
    }

    if (! finish) {
        console.log(`  … ${name} keeps running`);
        return;
    }

    await (failed ? context.testFailed() : context.testSucceeded());
    if (! failed) {
        console.log(`  ✓ ${name}`);
    }
    await context.destroy({ immediately: true });
}

const LOGIN = 'Tests\\Browser\\LoginTest';
const CHECKOUT = 'Tests\\Browser\\CheckoutTest';
const PROFILE = 'Tests\\Browser\\ProfileTest';

console.log('Recording GUI scenarios');

await run('test_guest_sees_login_link', LOGIN, async (b) => {
    await b.setContent(loginPage(false));
    await b.assertSee('Log in');
});

await run('test_user_can_log_out', LOGIN, async (b) => {
    await b.setContent(loginPage(false));
    await b.type('#email', 'ada@example.com');
    await b.type('#password', 'secret');
    await b.click('#submit');
    await b.waitForText('Dashboard');
    await b.click('#logout');
    await b.assertSee('Log in');
});

// Fails after a server error: the failure card points at the console error before the step.
await run('test_user_can_log_in', LOGIN, async (b) => {
    await b.setTimeout(2000);
    await b.setContent(loginPage(true));
    await b.type('#email', 'ada@example.com');
    await b.type('#password', 'secret');
    await b.click('#submit');
    await b.assertSee('Dashboard');
});

// Passes, with a warning, a log and a slow step.
await run('test_checkout_applies_coupon', CHECKOUT, async (b) => {
    await b.setContent(checkoutPage);
    await b.type('#coupon', 'PUTH20');
    await b.click('#apply');
    await b.waitForText('€ 38.40');
    await b.assertSeeIn('#total', '38.40');
});

// Fails on a missing element after an uncaught page error.
await run('test_checkout_shows_total', CHECKOUT, async (b) => {
    await b.setTimeout(1000);
    await b.setContent(brokenCheckoutPage);
    await b.click('#pay');
    await b.assertSeeIn('#total', '€ 38.40');
});

// Many steps, to check scrolling and the timing bars.
await run('test_user_can_update_profile', PROFILE, async (b) => {
    await b.setContent(profilePage);
    for (const [field, value] of [['#first', 'Ada'], ['#last', 'Lovelace'], ['#email', 'ada@example.com'], ['#phone', '+43 1 234 567'], ['#city', 'Vienna']]) {
        await b.type(field, value);
        await b.assertValue(field, value);
    }
    await b.select('#country', 'at');
    await b.check('#newsletter');
    await b.assertChecked('#newsletter');
    await b.click('#save');
    await b.waitForText('Saved');
    await b.assertSeeIn('#status', 'Saved');
});

// Long arguments and requests between the steps. Failed requests show up as problems.
await run('test_dashboard_loads_widgets', 'Tests\\Browser\\DashboardTest', async (b) => {
    await b.setContent(page('Dashboard', '<main><div class="card"><h2 style="margin:0">Dashboard</h2><div id="widgets">Loading…</div></div></main>'));
    await b.evaluate(`(async () => {
        const widgets = document.getElementById('widgets');
        const data = await fetch('data:application/json,' + encodeURIComponent(JSON.stringify({ widgets: ['Revenue', 'Orders', 'Visitors'] }))).then((response) => response.json());
        widgets.textContent = data.widgets.join(', ');
        await fetch('http://127.0.0.1:9/api/notifications').catch(() => console.error('Could not load notifications'));
    })()`);
    await b.waitForText('Revenue, Orders, Visitors');
    await b.assertSeeIn('#widgets', 'Visitors');
});

// A single page app moves between hash routes, then the test sets new content. Each page starts a section.
const shopPage = page('Shop', `
<main><div class="card">
  <nav style="display:flex;gap:12px"><a href="#" id="to-products">Products</a><a href="#" id="to-cart">Cart</a></nav>
  <div id="view"><h2 style="margin:0">Welcome</h2></div>
</div></main>`, `
const views = { '/products': '<h2 style="margin:0">Products</h2><button id="add">Add PUTH mug</button>', '/cart': '<h2 style="margin:0">Cart</h2><div id="items">1 × PUTH mug</div>' };
const go = (path) => { location.hash = path; document.getElementById('view').innerHTML = views[path]; };
document.getElementById('to-products').addEventListener('click', (event) => { event.preventDefault(); go('/products'); });
document.getElementById('to-cart').addEventListener('click', (event) => { event.preventDefault(); go('/cart'); });`);

await run('test_user_buys_a_mug', 'Tests\\Browser\\ShopTest', async (b) => {
    await b.setContent(shopPage);
    await b.click('#to-products');
    await b.waitForText('Add PUTH mug');
    await b.click('#add');
    await b.click('#to-cart');
    await b.assertSeeIn('#items', 'PUTH mug');
    await b.setContent(page('Receipt', '<main><div class="card"><h2 style="margin:0">Thank you</h2><div>Order 1042</div></div></main>'));
    await b.assertSee('Order 1042');
});

// No class, a single step.
await run('test_visit_website', '', async (b) => {
    await b.setContent(page('Home', '<main><div class="card"><h2 style="margin:0">Puth playground</h2></div></main>'));
    await b.assertTitle('Home');
});

// Agents work through the MCP server, built into workspaces/mcp/dist by the setup.
async function agent() {
    const transport = new StdioClientTransport({
        command: process.execPath,
        args: ['workspaces/mcp/dist/cli.mjs'],
        stderr: 'ignore',
        env: { PATH: process.env.PATH, PUTH_INSTANCE_URL: instanceUrl, PUTH_ARTIFACT_DIR: '/tmp/puth-gui-scenarios' },
    });
    const mcp = new Client({ name: 'gui-scenarios', version: '1.0.0' });
    await mcp.connect(transport);
    const tool = async (name, args = {}) => {
        const result = await mcp.callTool({ name, arguments: args });
        return result.content.find(({ type }) => type === 'text')?.text ?? '';
    };
    return { tool, close: () => mcp.close() };
}

const dataUrl = (html) => 'data:text/html;charset=utf-8,' + encodeURIComponent(html);

// An agent explores the checkout, fails one check on the way and exports a draft.
{
    const { tool, close } = await agent();
    const created = await tool('puth_session_create', { name: 'Explore coupon checkout', url: dataUrl(checkoutPage) });
    const sessionId = created.match(/^session (\w+)/)[1];
    await tool('puth_run', { sessionId, steps: [
        { op: 'type', selector: '#coupon', text: 'PUTH20' },
        { op: 'click', selector: '#apply' },
        { op: 'waitText', text: '€ 38.40', timeout: 4000 },
    ] });
    await tool('puth_inspect', { sessionId, find: 'total' });
    await tool('puth_run', { sessionId, steps: [{ op: 'see', text: 'Free shipping', timeout: 300 }] });
    await tool('puth_run', { sessionId, steps: [{ op: 'seeIn', selector: '#total', text: '38.40' }] });
    await tool('puth_export', { sessionId, format: 'laravel', name: 'Applies a coupon', steps: [0, 1, 2, 4] });
    await tool('puth_session_close', { sessionId });
    await close();
    console.log('  ✓ agent: Explore coupon checkout');
}

// A test sets up a logged in user and hands its browser to an agent, which checks the profile page.
{
    const context = await Context.create(client, { snapshot: true, test: { name: 'test_profile_after_login' }, group: PROFILE });
    const browser = await context.createBrowserShim();
    await browser.resize(1280, 720);
    await browser.setContent(profilePage);
    const result = context.handoff(browser, { name: 'logged in as Ada' }).then(() => context.testSucceeded());

    const { tool, close } = await agent();
    let id;
    for (let attempt = 0; attempt < 20 && id === undefined; attempt++) {
        id = (await tool('puth_contexts')).split('\n').find((line) => line.includes('handoff:waiting'))?.split(' ')[0];
        if (id === undefined) await new Promise((resolve) => setTimeout(resolve, 250));
    }
    const created = await tool('puth_session_create', { handoff: id });
    const sessionId = created.match(/^session (\w+)/)[1];
    await tool('puth_run', { sessionId, steps: [
        { op: 'type', selector: '#first', text: 'Ada' },
        { op: 'type', selector: '#city', text: 'Vienna' },
        { op: 'click', selector: '#save' },
        { op: 'see', text: 'Saved' },
    ] });
    await tool('puth_export', { sessionId, format: 'laravel', name: 'Saves the profile' });
    await tool('puth_session_close', { sessionId });
    await close();
    await result;
    await context.destroy({ immediately: true });
    console.log('  ✓ handoff: test_profile_after_login');
}

// A live agent session, made the way the MCP server makes them, which stays open.
{
    const context = await Context.create(client, { snapshot: true, group: 'mcp', test: { name: 'Check login errors' }, track: ['network'] });
    const browser = await context.createBrowserShim();
    const annotate = (annotation) => context.callFunc('annotate', [annotation]);
    await browser.resize(1280, 720);
    await annotate({ kind: 'tool', tool: 'puth_session_create', summary: 'login page' });
    await browser.setContent(loginPage(true));
    await annotate({ kind: 'tool', tool: 'puth_run', summary: 'type, type, click', steps: 3 });
    await browser.type('#email', 'ada@example.com');
    await browser.type('#password', 'wrong');
    await browser.click('#submit');
    console.log('  … agent: Check login errors stays live');
}

// Stays open, so it shows as running until the instance cleans it up.
await run('test_checkout_waits_for_payment', CHECKOUT, async (b) => {
    await b.setContent(checkoutPage);
    await b.type('#coupon', 'PENDING');
}, { finish: false });

console.log('Done. Open the GUI and connect to the instance.');
process.exit(0);
