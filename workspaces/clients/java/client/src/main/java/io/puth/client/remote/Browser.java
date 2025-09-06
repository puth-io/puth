package io.puth.client.remote;

import io.puth.client.RemoteObject;
import java.util.Map;

/**

*/
public class Browser extends RemoteObject {
    public Browser(String id, String type, String represents, RemoteObject parent, io.puth.client.Context context) {
        super(id, type, represents, parent, context);
    }

    public Browser clone() {
        return this.clone(null);
    }

    public Browser clone(Object site) {
        return (Browser) this.callFunc("clone", new Object[]{site});
    }

    public Browser setTimeout(int timeout) {
        return (Browser) this.callFunc("setTimeout", new Object[]{timeout});
    }

    public Browser setFunctionTimeoutMultiplier(int timeout) {
        return (Browser) this.callFunc("setFunctionTimeoutMultiplier", new Object[]{timeout});
    }

    public Browser setResolverPrefix(String prefix) {
        return (Browser) this.callFunc("setResolverPrefix", new Object[]{prefix});
    }

    public Browser setResolverPageElements(Map<String, Object> pageElements) {
        return (Browser) this.callFunc("setResolverPageElements", new Object[]{pageElements});
    }

    public Browser withinIframe(String selector) {
        return (Browser) this.callFunc("withinIframe", new Object[]{selector});
    }

    public Browser visit(String url) {
        return (Browser) this.callFunc("visit", new Object[]{url});
    }

    public Browser click() {
        return this.click(null, Map.of());
    }

    public Browser click(Object selector) {
        return this.click(selector, Map.of());
    }

    public Browser click(Object selector, Object options) {
        return (Browser) this.callFunc("click", new Object[]{selector, options});
    }

    public Browser clickLink(String selector) {
        return this.clickLink(selector, "a");
    }

    public Browser clickLink(String selector, String element) {
        return (Browser) this.callFunc("clickLink", new Object[]{selector, element});
    }

    public Browser clickAtPoint(int x, int y) {
        return (Browser) this.callFunc("clickAtPoint", new Object[]{x, y});
    }

    public Browser clickAtXPath(String expression) {
        return (Browser) this.callFunc("clickAtXPath", new Object[]{expression});
    }

    public Browser clickAndHold() {
        return this.clickAndHold(null);
    }

    public Browser clickAndHold(Object selector) {
        return (Browser) this.callFunc("clickAndHold", new Object[]{selector});
    }

    public Browser doubleClick() {
        return this.doubleClick(null);
    }

    public Browser doubleClick(Object selector) {
        return (Browser) this.callFunc("doubleClick", new Object[]{selector});
    }

    public Browser rightClick() {
        return this.rightClick(null);
    }

    public Browser rightClick(Object selector) {
        return (Browser) this.callFunc("rightClick", new Object[]{selector});
    }

    public Browser controlClick() {
        return this.controlClick(null);
    }

    public Browser controlClick(Object selector) {
        return (Browser) this.callFunc("controlClick", new Object[]{selector});
    }

    public Browser releaseMouse() {
        return (Browser) this.callFunc("releaseMouse", new Object[]{});
    }

    public Browser moveMouse(int xOffset, int yOffset) {
        return (Browser) this.callFunc("moveMouse", new Object[]{xOffset, yOffset});
    }

    public Browser setContent(String html) {
        return this.setContent(html, Map.of());
    }

    public Browser setContent(String html, Object options) {
        return (Browser) this.callFunc("setContent", new Object[]{html, options});
    }

    public Browser blank() {
        return (Browser) this.callFunc("blank", new Object[]{});
    }

    public Browser refresh() {
        return this.refresh(Map.of());
    }

    public Browser refresh(Object options) {
        return (Browser) this.callFunc("refresh", new Object[]{options});
    }

    public Browser back() {
        return this.back(Map.of());
    }

    public Browser back(Object options) {
        return (Browser) this.callFunc("back", new Object[]{options});
    }

    public Browser forward() {
        return this.forward(Map.of());
    }

    public Browser forward(Object options) {
        return (Browser) this.callFunc("forward", new Object[]{options});
    }

    public Browser maximize() {
        return (Browser) this.callFunc("maximize", new Object[]{});
    }

    public Map<String, Object> bounds() {
        return (Map<String, Object>) this.callFunc("bounds", new Object[]{});
    }

    public Browser setBounds(Object bounds) {
        return (Browser) this.callFunc("setBounds", new Object[]{bounds});
    }

    public Browser resize(int width, int height) {
        return (Browser) this.callFunc("resize", new Object[]{width, height});
    }

    public Browser move(int x, int y) {
        return (Browser) this.callFunc("move", new Object[]{x, y});
    }

    public Browser scrollIntoView(String selector) {
        return (Browser) this.callFunc("scrollIntoView", new Object[]{selector});
    }

    public Map<String, Object> clickablePoint(String selector) {
        return this.clickablePoint(selector, null);
    }

    public Map<String, Object> clickablePoint(String selector, Object offset) {
        return (Map<String, Object>) this.callFunc("clickablePoint", new Object[]{selector, offset});
    }

    public Browser scrollTo(String selector) {
        return (Browser) this.callFunc("scrollTo", new Object[]{selector});
    }

    public void quit() {
        this.callFunc("quit", new Object[]{});
    }

    public String url() {
        return (String) this.callFunc("url", new Object[]{});
    }

    public String scheme() {
        return (String) this.callFunc("scheme", new Object[]{});
    }

    public String host() {
        return (String) this.callFunc("host", new Object[]{});
    }

    public String path() {
        return (String) this.callFunc("path", new Object[]{});
    }

    public String port() {
        return (String) this.callFunc("port", new Object[]{});
    }

    public String title() {
        return (String) this.callFunc("title", new Object[]{});
    }

    public String content() {
        return (String) this.callFunc("content", new Object[]{});
    }

    public Map<String, Object> viewport() {
        return (Map<String, Object>) this.callFunc("viewport", new Object[]{});
    }

    public Object getCookieByName(String name) {
        return (Object) this.callFunc("getCookieByName", new Object[]{name});
    }

    public Browser setCookie(Object[] cookies) {
        return (Browser) this.callFunc("setCookie", new Object[]{cookies});
    }

    public Browser deleteCookie(Object cookies) {
        return (Browser) this.callFunc("deleteCookie", new Object[]{cookies});
    }

    public Object screenshot() {
        return this.screenshot(Map.of());
    }

    public Object screenshot(Object options) {
        return (Object) this.callFunc("screenshot", new Object[]{options});
    }

    public Browser fitContent() {
        return (Browser) this.callFunc("fitContent", new Object[]{});
    }

    public Browser disableFitOnFailure() {
        return (Browser) this.callFunc("disableFitOnFailure", new Object[]{});
    }

    public Browser enableFitOnFailure() {
        return (Browser) this.callFunc("enableFitOnFailure", new Object[]{});
    }

    public String text(String selector) {
        return (String) this.callFunc("text", new Object[]{selector});
    }

    public String attribute(String selector, String attribute) {
        return (String) this.callFunc("attribute", new Object[]{selector, attribute});
    }

    public Browser _type(String selector, String value) {
        return this._type(selector, value, Map.of());
    }

    public Browser _type(String selector, String value, Object options) {
        return (Browser) this.callFunc("_type", new Object[]{selector, value, options});
    }

    public Browser type(String selector, String value) {
        return (Browser) this.callFunc("type", new Object[]{selector, value});
    }

    public Browser typeSlowly(String selector, String value) {
        return this.typeSlowly(selector, value, 100);
    }

    public Browser typeSlowly(String selector, String value, int pause) {
        return (Browser) this.callFunc("typeSlowly", new Object[]{selector, value, pause});
    }

    public Browser append(String selector, String value) {
        return (Browser) this.callFunc("append", new Object[]{selector, value});
    }

    public Browser appendSlowly(String selector, String value) {
        return this.appendSlowly(selector, value, 100);
    }

    public Browser appendSlowly(String selector, String value, int pause) {
        return (Browser) this.callFunc("appendSlowly", new Object[]{selector, value, pause});
    }

    public Browser clear(String selector) {
        return (Browser) this.callFunc("clear", new Object[]{selector});
    }

    public Browser keys(String selector) {
        return this.keys(selector, new String[]{});
    }

    public Browser keys(String selector, String[] keys) {
        return (Browser) this.callFunc("keys", new Object[]{selector, keys});
    }

    public Browser select(String selector) {
        return this.select(selector, null);
    }

    public Browser select(String selector, Object value) {
        return (Browser) this.callFunc("select", new Object[]{selector, value});
    }

    public Browser radio(String selector, String value) {
        return (Browser) this.callFunc("radio", new Object[]{selector, value});
    }

    public Browser _check(boolean shouldBeChecked, String selector) {
        return this._check(shouldBeChecked, selector, null);
    }

    public Browser _check(boolean shouldBeChecked, String selector, Object value) {
        return (Browser) this.callFunc("_check", new Object[]{shouldBeChecked, selector, value});
    }

    public Browser check(String selector) {
        return this.check(selector, null);
    }

    public Browser check(String selector, Object value) {
        return (Browser) this.callFunc("check", new Object[]{selector, value});
    }

    public Browser uncheck(String selector) {
        return this.uncheck(selector, null);
    }

    public Browser uncheck(String selector, Object value) {
        return (Browser) this.callFunc("uncheck", new Object[]{selector, value});
    }

    public Browser drag(String from, String to) {
        return (Browser) this.callFunc("drag", new Object[]{from, to});
    }

    public Browser dragOffset(String selector, int x, int y) {
        return (Browser) this.callFunc("dragOffset", new Object[]{selector, x, y});
    }

    public Browser dragUp(String selector, int offset) {
        return (Browser) this.callFunc("dragUp", new Object[]{selector, offset});
    }

    public Browser dragDown(String selector, int offset) {
        return (Browser) this.callFunc("dragDown", new Object[]{selector, offset});
    }

    public Browser dragLeft(String selector, int offset) {
        return (Browser) this.callFunc("dragLeft", new Object[]{selector, offset});
    }

    public Browser dragRight(String selector, int offset) {
        return (Browser) this.callFunc("dragRight", new Object[]{selector, offset});
    }

    public Object _waitFor(Object selector) {
        return this._waitFor(selector, null);
    }

    public Object _waitFor(Object selector, Map<String, Object> options) {
        return (Object) this.callFunc("_waitFor", new Object[]{selector, options});
    }

    public Browser waitFor(String selector) {
        return this.waitFor(selector, null);
    }

    public Browser waitFor(String selector, Object timeout) {
        return (Browser) this.callFunc("waitFor", new Object[]{selector, timeout});
    }

    public Browser waitUntilMissing(String selector) {
        return this.waitUntilMissing(selector, null);
    }

    public Browser waitUntilMissing(String selector, Object timeout) {
        return (Browser) this.callFunc("waitUntilMissing", new Object[]{selector, timeout});
    }

    public Browser waitForLink(String selector) {
        return this.waitForLink(selector, null);
    }

    public Browser waitForLink(String selector, Object timeout) {
        return (Browser) this.callFunc("waitForLink", new Object[]{selector, timeout});
    }

    public Browser waitForInput(String selector) {
        return this.waitForInput(selector, null);
    }

    public Browser waitForInput(String selector, Object timeout) {
        return (Browser) this.callFunc("waitForInput", new Object[]{selector, timeout});
    }

    public Browser waitForLocation(String selector) {
        return this.waitForLocation(selector, null);
    }

    public Browser waitForLocation(String selector, Object timeout) {
        return (Browser) this.callFunc("waitForLocation", new Object[]{selector, timeout});
    }

    public Browser waitForEvent(String type) {
        return this.waitForEvent(type, "", null);
    }

    public Browser waitForEvent(String type, String target) {
        return this.waitForEvent(type, target, null);
    }

    public Browser waitForEvent(String type, String target, Object timeout) {
        return (Browser) this.callFunc("waitForEvent", new Object[]{type, target, timeout});
    }

    public Browser waitForNotPresent(String selector) {
        return this.waitForNotPresent(selector, Map.of());
    }

    public Browser waitForNotPresent(String selector, Map<String, Object> options) {
        return (Browser) this.callFunc("waitForNotPresent", new Object[]{selector, options});
    }

    public Browser waitForText(Object text) {
        return this.waitForText(text, null, false);
    }

    public Browser waitForText(Object text, Object timeout) {
        return this.waitForText(text, timeout, false);
    }

    public Browser waitForText(Object text, Object timeout, boolean ignoreCase) {
        return (Browser) this.callFunc("waitForText", new Object[]{text, timeout, ignoreCase});
    }

    public Browser waitUntilMissingText(Object text) {
        return this.waitUntilMissingText(text, null, false);
    }

    public Browser waitUntilMissingText(Object text, Object timeout) {
        return this.waitUntilMissingText(text, timeout, false);
    }

    public Browser waitUntilMissingText(Object text, Object timeout, boolean ignoreCase) {
        return (Browser) this.callFunc("waitUntilMissingText", new Object[]{text, timeout, ignoreCase});
    }

    public Browser waitForTextIn(String selector, Object text) {
        return this.waitForTextIn(selector, text, null, false);
    }

    public Browser waitForTextIn(String selector, Object text, Object timeout) {
        return this.waitForTextIn(selector, text, timeout, false);
    }

    public Browser waitForTextIn(String selector, Object text, Object timeout, boolean ignoreCase) {
        return (Browser) this.callFunc("waitForTextIn", new Object[]{selector, text, timeout, ignoreCase});
    }

    public Browser waitUntilMissingTextIn(String selector, Object text) {
        return this.waitUntilMissingTextIn(selector, text, null, false);
    }

    public Browser waitUntilMissingTextIn(String selector, Object text, Object timeout) {
        return this.waitUntilMissingTextIn(selector, text, timeout, false);
    }

    public Browser waitUntilMissingTextIn(String selector, Object text, Object timeout, boolean ignoreCase) {
        return (Browser) this.callFunc("waitUntilMissingTextIn", new Object[]{selector, text, timeout, ignoreCase});
    }

    public void waitUntil(Object pageFunction) {
        this.waitUntil(pageFunction, new Object[]{}, null, Map.of());
    }

    public void waitUntil(Object pageFunction, Object[] args) {
        this.waitUntil(pageFunction, args, null, Map.of());
    }

    public void waitUntil(Object pageFunction, Object[] args, Object message) {
        this.waitUntil(pageFunction, args, message, Map.of());
    }

    public void waitUntil(Object pageFunction, Object[] args, Object message, Map<String, Object> options) {
        this.callFunc("waitUntil", new Object[]{pageFunction, args, message, options});
    }

    public void waitUntilAttribute(String selector, String attribute, Object value, String message) {
        this.waitUntilAttribute(selector, attribute, value, message, Map.of());
    }

    public void waitUntilAttribute(String selector, String attribute, Object value, String message, Map<String, Object> options) {
        this.callFunc("waitUntilAttribute", new Object[]{selector, attribute, value, message, options});
    }

    public Browser waitUntilEnabled(String selector) {
        return this.waitUntilEnabled(selector, Map.of());
    }

    public Browser waitUntilEnabled(String selector, Map<String, Object> options) {
        return (Browser) this.callFunc("waitUntilEnabled", new Object[]{selector, options});
    }

    public Browser waitUntilDisabled(String selector) {
        return this.waitUntilDisabled(selector, Map.of());
    }

    public Browser waitUntilDisabled(String selector, Map<String, Object> options) {
        return (Browser) this.callFunc("waitUntilDisabled", new Object[]{selector, options});
    }

    public Object find(String selector) {
        return this.find(selector, Map.of());
    }

    public Object find(String selector, Map<String, Object> options) {
        return (Object) this.callFunc("find", new Object[]{selector, options});
    }

    public RemoteObject[] findAll(Object selector) {
        return this.findAll(selector, Map.of());
    }

    public RemoteObject[] findAll(Object selector, Map<String, Object> options) {
        return (RemoteObject[]) this.callFunc("findAll", new Object[]{selector, options});
    }

    public RemoteObject[] findOrFail(Object selector) {
        return this.findOrFail(selector, Map.of());
    }

    public RemoteObject[] findOrFail(Object selector, Map<String, Object> options) {
        return (RemoteObject[]) this.callFunc("findOrFail", new Object[]{selector, options});
    }

    public RemoteObject firstOrFail(Object selector) {
        return this.firstOrFail(selector, Map.of());
    }

    public RemoteObject firstOrFail(Object selector, Map<String, Object> options) {
        return (RemoteObject) this.callFunc("firstOrFail", new Object[]{selector, options});
    }

    public Browser press(String button) {
        return (Browser) this.callFunc("press", new Object[]{button});
    }

    public Browser pressAndWaitFor(String button) {
        return (Browser) this.callFunc("pressAndWaitFor", new Object[]{button});
    }

    public Browser assertTitle(String title) {
        return (Browser) this.callFunc("assertTitle", new Object[]{title});
    }

    public Browser assertTitleContains(String title) {
        return (Browser) this.callFunc("assertTitleContains", new Object[]{title});
    }

    public Browser assertHasCookie(String name) {
        return (Browser) this.callFunc("assertHasCookie", new Object[]{name});
    }

    public Browser assertCookieMissing(String name) {
        return (Browser) this.callFunc("assertCookieMissing", new Object[]{name});
    }

    public Browser assertCookieValue(String name, String value) {
        return (Browser) this.callFunc("assertCookieValue", new Object[]{name, value});
    }

    public Browser assertSee(String text) {
        return this.assertSee(text, false);
    }

    public Browser assertSee(String text, boolean ignoreCase) {
        return (Browser) this.callFunc("assertSee", new Object[]{text, ignoreCase});
    }

    public Browser assertDontSee(String text) {
        return this.assertDontSee(text, false);
    }

    public Browser assertDontSee(String text, boolean ignoreCase) {
        return (Browser) this.callFunc("assertDontSee", new Object[]{text, ignoreCase});
    }

    public Browser assertSeeIn(String selector, String text) {
        return this.assertSeeIn(selector, text, false);
    }

    public Browser assertSeeIn(String selector, String text, Object ignoreCase) {
        return (Browser) this.callFunc("assertSeeIn", new Object[]{selector, text, ignoreCase});
    }

    public Browser assertDontSeeIn(String selector, String text) {
        return this.assertDontSeeIn(selector, text, false);
    }

    public Browser assertDontSeeIn(String selector, String text, Object ignoreCase) {
        return (Browser) this.callFunc("assertDontSeeIn", new Object[]{selector, text, ignoreCase});
    }

    public Browser assertSeeAnythingIn(String selector) {
        return (Browser) this.callFunc("assertSeeAnythingIn", new Object[]{selector});
    }

    public Browser assertSeeNothingIn(String selector) {
        return (Browser) this.callFunc("assertSeeNothingIn", new Object[]{selector});
    }

    public Browser assertScript(String expression) {
        return this.assertScript(expression, true);
    }

    public Browser assertScript(String expression, Object expected) {
        return (Browser) this.callFunc("assertScript", new Object[]{expression, expected});
    }

    public Browser assertSourceHas(String code) {
        return (Browser) this.callFunc("assertSourceHas", new Object[]{code});
    }

    public Browser assertSourceMissing(String code) {
        return (Browser) this.callFunc("assertSourceMissing", new Object[]{code});
    }

    public Browser assertSeeLink(String link) {
        return this.assertSeeLink(link, "a", Map.of());
    }

    public Browser assertSeeLink(String link, String selector) {
        return this.assertSeeLink(link, selector, Map.of());
    }

    public Browser assertSeeLink(String link, String selector, Map<String, Object> options) {
        return (Browser) this.callFunc("assertSeeLink", new Object[]{link, selector, options});
    }

    public Browser assertDontSeeLink(String link) {
        return this.assertDontSeeLink(link, "a", Map.of());
    }

    public Browser assertDontSeeLink(String link, String selector) {
        return this.assertDontSeeLink(link, selector, Map.of());
    }

    public Browser assertDontSeeLink(String link, String selector, Map<String, Object> options) {
        return (Browser) this.callFunc("assertDontSeeLink", new Object[]{link, selector, options});
    }

    public Browser assertInputValue(Object field, String value) {
        return (Browser) this.callFunc("assertInputValue", new Object[]{field, value});
    }

    public Browser assertInputValueIsNot(Object field, String value) {
        return (Browser) this.callFunc("assertInputValueIsNot", new Object[]{field, value});
    }

    public void resolveForTyping(String selector) {
        this.callFunc("resolveForTyping", new Object[]{selector});
    }

    public void resolveForChecking(Object field) {
        this.resolveForChecking(field, null);
    }

    public void resolveForChecking(Object field, Object value) {
        this.callFunc("resolveForChecking", new Object[]{field, value});
    }

    public void resolveForRadioSelection(Object field) {
        this.resolveForRadioSelection(field, null);
    }

    public void resolveForRadioSelection(Object field, Object value) {
        this.callFunc("resolveForRadioSelection", new Object[]{field, value});
    }

    public void resolveForSelection(String field) {
        this.callFunc("resolveForSelection", new Object[]{field});
    }

    public void resolveSelectOptions(String field) {
        this.callFunc("resolveSelectOptions", new Object[]{field});
    }

    public void resolveForField(String field) {
        this.callFunc("resolveForField", new Object[]{field});
    }

    public Object resolveForButtonPress(String field) {
        return (Object) this.callFunc("resolveForButtonPress", new Object[]{field});
    }

    public String inputValue(Object field) {
        return (String) this.callFunc("inputValue", new Object[]{field});
    }

    public Browser assertInputPresent(String field) {
        return this.assertInputPresent(field, null);
    }

    public Browser assertInputPresent(String field, Object timeout) {
        return (Browser) this.callFunc("assertInputPresent", new Object[]{field, timeout});
    }

    public Browser assertInputMissing(String field) {
        return this.assertInputMissing(field, null);
    }

    public Browser assertInputMissing(String field, Object timeout) {
        return (Browser) this.callFunc("assertInputMissing", new Object[]{field, timeout});
    }

    public Browser assertChecked(String field) {
        return this.assertChecked(field, null);
    }

    public Browser assertChecked(String field, Object value) {
        return (Browser) this.callFunc("assertChecked", new Object[]{field, value});
    }

    public Browser assertNotChecked(String field) {
        return this.assertNotChecked(field, null);
    }

    public Browser assertNotChecked(String field, Object value) {
        return (Browser) this.callFunc("assertNotChecked", new Object[]{field, value});
    }

    public Browser assertIndeterminate(String field) {
        return this.assertIndeterminate(field, null);
    }

    public Browser assertIndeterminate(String field, Object value) {
        return (Browser) this.callFunc("assertIndeterminate", new Object[]{field, value});
    }

    public Browser assertRadioSelected(String field, String value) {
        return (Browser) this.callFunc("assertRadioSelected", new Object[]{field, value});
    }

    public Browser assertRadioNotSelected(String field) {
        return this.assertRadioNotSelected(field, null);
    }

    public Browser assertRadioNotSelected(String field, Object value) {
        return (Browser) this.callFunc("assertRadioNotSelected", new Object[]{field, value});
    }

    public Browser assertSelected(String field, Object value) {
        return (Browser) this.callFunc("assertSelected", new Object[]{field, value});
    }

    public Browser assertNotSelected(String field, Object value) {
        return (Browser) this.callFunc("assertNotSelected", new Object[]{field, value});
    }

    public Browser assertSelectHasOptions(String field, String[] values) {
        return (Browser) this.callFunc("assertSelectHasOptions", new Object[]{field, values});
    }

    public Browser assertSelectMissingOptions(String field, String[] values) {
        return (Browser) this.callFunc("assertSelectMissingOptions", new Object[]{field, values});
    }

    public Browser assertSelectHasOption(String field, String value) {
        return (Browser) this.callFunc("assertSelectHasOption", new Object[]{field, value});
    }

    public Browser assertSelectMissingOption(String field, String value) {
        return (Browser) this.callFunc("assertSelectMissingOption", new Object[]{field, value});
    }

    public Browser assertValue(String selector, String value) {
        return (Browser) this.callFunc("assertValue", new Object[]{selector, value});
    }

    public Browser assertValueIsNot(String selector, String value) {
        return (Browser) this.callFunc("assertValueIsNot", new Object[]{selector, value});
    }

    public Browser assertAttribute(String selector, String attribute, String value) {
        return (Browser) this.callFunc("assertAttribute", new Object[]{selector, attribute, value});
    }

    public Browser assertAttributeMissing(String selector, String attribute) {
        return (Browser) this.callFunc("assertAttributeMissing", new Object[]{selector, attribute});
    }

    public Browser assertAttributeContains(String selector, String attribute, String value) {
        return (Browser) this.callFunc("assertAttributeContains", new Object[]{selector, attribute, value});
    }

    public Browser assertAttributeDoesntContain(String selector, String attribute, String value) {
        return (Browser) this.callFunc("assertAttributeDoesntContain", new Object[]{selector, attribute, value});
    }

    public Browser assertAriaAttribute(String selector, String attribute, String value) {
        return (Browser) this.callFunc("assertAriaAttribute", new Object[]{selector, attribute, value});
    }

    public Browser assertDataAttribute(String selector, String attribute, String value) {
        return (Browser) this.callFunc("assertDataAttribute", new Object[]{selector, attribute, value});
    }

    public Browser assertVisible(String selector) {
        return this.assertVisible(selector, Map.of());
    }

    public Browser assertVisible(String selector, Map<String, Object> options) {
        return (Browser) this.callFunc("assertVisible", new Object[]{selector, options});
    }

    public Browser assertMissing(String selector) {
        return this.assertMissing(selector, Map.of());
    }

    public Browser assertMissing(String selector, Map<String, Object> options) {
        return (Browser) this.callFunc("assertMissing", new Object[]{selector, options});
    }

    public Browser assertPresent(String selector) {
        return this.assertPresent(selector, Map.of());
    }

    public Browser assertPresent(String selector, Map<String, Object> options) {
        return (Browser) this.callFunc("assertPresent", new Object[]{selector, options});
    }

    public Browser assertNotPresent(String selector) {
        return this.assertNotPresent(selector, Map.of());
    }

    public Browser assertNotPresent(String selector, Map<String, Object> options) {
        return (Browser) this.callFunc("assertNotPresent", new Object[]{selector, options});
    }

    public Browser assertEnabled(String field) {
        return (Browser) this.callFunc("assertEnabled", new Object[]{field});
    }

    public Browser assertDisabled(Object field) {
        return (Browser) this.callFunc("assertDisabled", new Object[]{field});
    }

    public Browser assertButtonEnabled(Object button) {
        return (Browser) this.callFunc("assertButtonEnabled", new Object[]{button});
    }

    public Browser assertButtonDisabled(String button) {
        return (Browser) this.callFunc("assertButtonDisabled", new Object[]{button});
    }

    public Browser assertFocused(String field) {
        return (Browser) this.callFunc("assertFocused", new Object[]{field});
    }

    public Browser assertNotFocused(String field) {
        return (Browser) this.callFunc("assertNotFocused", new Object[]{field});
    }

    public Browser assertVue(String key, Object value) {
        return this.assertVue(key, value, null);
    }

    public Browser assertVue(String key, Object value, Object componentSelector) {
        return (Browser) this.callFunc("assertVue", new Object[]{key, value, componentSelector});
    }

    public Browser assertVueIsNot(String key, Object value) {
        return this.assertVueIsNot(key, value, null);
    }

    public Browser assertVueIsNot(String key, Object value, Object componentSelector) {
        return (Browser) this.callFunc("assertVueIsNot", new Object[]{key, value, componentSelector});
    }

    public Browser assertVueContains(String key, Object value) {
        return this.assertVueContains(key, value, null);
    }

    public Browser assertVueContains(String key, Object value, Object componentSelector) {
        return (Browser) this.callFunc("assertVueContains", new Object[]{key, value, componentSelector});
    }

    public Browser assertVueDoesntContain(String key, Object value) {
        return this.assertVueDoesntContain(key, value, null);
    }

    public Browser assertVueDoesntContain(String key, Object value, Object componentSelector) {
        return (Browser) this.callFunc("assertVueDoesntContain", new Object[]{key, value, componentSelector});
    }

    public Browser assertVueDoesNotContain(String key, Object value) {
        return this.assertVueDoesNotContain(key, value, null);
    }

    public Browser assertVueDoesNotContain(String key, Object value, Object componentSelector) {
        return (Browser) this.callFunc("assertVueDoesNotContain", new Object[]{key, value, componentSelector});
    }

    public Object vueAttribute(Object componentSelector, String key) {
        return (Object) this.callFunc("vueAttribute", new Object[]{componentSelector, key});
    }

    public Browser assertUrlIs(String url) {
        return this.assertUrlIs(url, Map.of());
    }

    public Browser assertUrlIs(String url, Map<String, Object> options) {
        return (Browser) this.callFunc("assertUrlIs", new Object[]{url, options});
    }

    public void _assertLocationProperty(String property, String expected) {
        this._assertLocationProperty(property, expected, true, 0);
    }

    public void _assertLocationProperty(String property, String expected, boolean matches) {
        this._assertLocationProperty(property, expected, matches, 0);
    }

    public void _assertLocationProperty(String property, String expected, boolean matches, int trimEnd) {
        this.callFunc("_assertLocationProperty", new Object[]{property, expected, matches, trimEnd});
    }

    public Browser assertSchemeIs(String scheme) {
        return (Browser) this.callFunc("assertSchemeIs", new Object[]{scheme});
    }

    public Browser assertSchemeIsNot(String scheme) {
        return (Browser) this.callFunc("assertSchemeIsNot", new Object[]{scheme});
    }

    public Browser assertPathIs(String scheme) {
        return (Browser) this.callFunc("assertPathIs", new Object[]{scheme});
    }

    public Browser assertPathIsNot(String scheme) {
        return (Browser) this.callFunc("assertPathIsNot", new Object[]{scheme});
    }

    public Browser assertHostIs(String host) {
        return (Browser) this.callFunc("assertHostIs", new Object[]{host});
    }

    public Browser assertHostIsNot(String host) {
        return (Browser) this.callFunc("assertHostIsNot", new Object[]{host});
    }

    public Browser assertPortIs(String port) {
        return (Browser) this.callFunc("assertPortIs", new Object[]{port});
    }

    public Browser assertPortIsNot(String port) {
        return (Browser) this.callFunc("assertPortIsNot", new Object[]{port});
    }

    public Browser assertPathBeginsWith(String path) {
        return (Browser) this.callFunc("assertPathBeginsWith", new Object[]{path});
    }

    public Browser assertPathEndsWith(String path) {
        return (Browser) this.callFunc("assertPathEndsWith", new Object[]{path});
    }

    public Browser assertPathContains(String path) {
        return (Browser) this.callFunc("assertPathContains", new Object[]{path});
    }

    public void _assertQueryStringParameter(String name) {
        this._assertQueryStringParameter(name, null, true);
    }

    public void _assertQueryStringParameter(String name, Object value) {
        this._assertQueryStringParameter(name, value, true);
    }

    public void _assertQueryStringParameter(String name, Object value, boolean matches) {
        this.callFunc("_assertQueryStringParameter", new Object[]{name, value, matches});
    }

    public Browser assertQueryStringHas(String name) {
        return this.assertQueryStringHas(name, null);
    }

    public Browser assertQueryStringHas(String name, Object value) {
        return (Browser) this.callFunc("assertQueryStringHas", new Object[]{name, value});
    }

    public Browser assertQueryStringMissing(String name) {
        return (Browser) this.callFunc("assertQueryStringMissing", new Object[]{name});
    }

    public Browser assertFragmentIs(String fragment) {
        return (Browser) this.callFunc("assertFragmentIs", new Object[]{fragment});
    }

    public Browser assertFragmentBeginsWith(String fragment) {
        return (Browser) this.callFunc("assertFragmentBeginsWith", new Object[]{fragment});
    }

    public Browser assertFragmentIsNot(String fragment) {
        return (Browser) this.callFunc("assertFragmentIsNot", new Object[]{fragment});
    }

    public void resolver(Object selector) {
        this.callFunc("resolver", new Object[]{selector});
    }

    public Browser waitForDialog() {
        return (Browser) this.callFunc("waitForDialog", new Object[]{});
    }

    public Browser assertDialogOpened(String message) {
        return (Browser) this.callFunc("assertDialogOpened", new Object[]{message});
    }

    public Browser typeInDialog(String value) {
        return (Browser) this.callFunc("typeInDialog", new Object[]{value});
    }

    public Browser acceptDialog() {
        return this.acceptDialog(null);
    }

    public Browser acceptDialog(Object value) {
        return (Browser) this.callFunc("acceptDialog", new Object[]{value});
    }

    public Browser dismissDialog() {
        return (Browser) this.callFunc("dismissDialog", new Object[]{});
    }

    public Browser mouseover(String selector) {
        return (Browser) this.callFunc("mouseover", new Object[]{selector});
    }

    public void isPage() {
        this.callFunc("isPage", new Object[]{});
    }

    public Object value(String selector) {
        return this.callFunc("value", new Object[]{selector});
    }

    public Browser value(String selector, Object value) {
        return (Browser) this.callFunc("value", new Object[]{selector, value});
    }

    public Browser keys(String selector, String keys) {
        return this.keys(selector, new String[]{keys});
    }

   public Object evaluate(String pageFunction) {
       return this.evaluate(pageFunction, new Object[]{});
   }

   public Object evaluate(String pageFunction, Object[] args) {
       return (Object) this.callFunc("evaluate", new Object[]{pageFunction, args});
   }

   public Object[] evaluate(String[] pageFunction) {
       return this.evaluate(pageFunction, new Object[]{});
   }

   public Object[] evaluate(String[] pageFunction, Object[] args) {
       return (Object[]) this.callFunc("evaluate", new Object[]{pageFunction, args});
   }
}
