package io.puth;

import io.puth.client.RemoteObject;
import org.junit.jupiter.api.Test;
import org.opentest4j.AssertionFailedError;

import java.time.Instant;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class AllMethodsTest extends BaseTest {
    private static final String SELECT_PAGE = """
            <select id="actions-select">
              <option value="" selected disabled>-- Select Value --</option>
              <option value="apple">Apple</option>
              <option value="orange">Orange</option>
            </select>
            <select id="actions-select-multiple" multiple>
              <option value="apple">Apple</option>
              <option value="orange">Orange</option>
            </select>
            """;

    /** Everything test_concern_makes_assertions and its inverse look at. */
    private static final String ASSERTIONS_PAGE = """
            <!doctype html>
            <html>
            <head><title>Assertions | Puth</title></head>
            <body>
              <nav class="navbar"><a href="%s">Alternate origin</a></nav>
              <h1>The assertions page</h1>
              <div class="example">
                <div id="querying-get">Div with id querying-get</div>
                <div class="querying-get">Div with class querying-get</div>
              </div>
              <div id="properties-value"><input type="text" name="properties-value-input" value="input with value"></div>
              <div id="properties-attributes" data-test="1234" aria-rowspan="5678">div with data and aria attribute</div>
              <div id="actions-type"><input type="text"></div>
              <input id="actions-focus" type="text">
              <button id="actions-click-double">double click</button>
              <button id="actions-click-disabled" disabled>disabled</button>
              <input type="checkbox" id="action-checkbox" name="action-checkbox" value="test-1234">
              <input type="radio" id="action-radio-apple" name="action-radio" value="apple">
              <input type="radio" id="action-radio-orange" name="action-radio" value="orange">
              <select id="actions-select-multiple" multiple>
                <option value="apple">Apple</option>
                <option value="orange">Orange</option>
              </select>
            </body>
            </html>
            """.formatted(alt());
    @Test
    void test_querying_elements() {
        browser.setContent("""
                <div id="querying-get">Div with id querying-get</div>
                <div class="querying-get">Div with class querying-get</div>
                <div class="querying-get">Div with class querying-get</div>
                """);

        RemoteObject[] els = browser.findAll(".querying-get");
        assertEquals(2, els.length, "Expected 2 elements with class .querying-get");

        RemoteObject[] idOne = browser.findAll("#querying-get");
        assertEquals(1, idOne.length, "Expected 1 element with id #querying-get");
    }

    @Test
    void test_press() {
        browser.setContent("""
                        <button onclick="document.querySelector('#verify').innerText = 'clicked button'">click me</button>
                        <p id="verify"></p>
                        <button onclick="this.disabled = true; setTimeout(() => this.disabled = false, 1000)">click and wait</button>
                        """)
                .press("click me")
                .assertSeeIn("#verify", "clicked button")
                .pressAndWaitFor("click and wait")
                .assertButtonEnabled("click and wait");
    }

    @Test
    void test_select() {
        browser.setContent(SELECT_PAGE)
                .select("#actions-select-multiple", new String[]{"apple", "orange"})
                .assertSelected("#actions-select-multiple", new String[]{"apple", "orange"})
                .select("#actions-select-multiple", "orange")
                .assertSelected("#actions-select-multiple", "orange")
                .assertSelected("#actions-select", "")
                .select("#actions-select", "orange")
                .assertSelected("#actions-select", "orange");

        browser.setContent(SELECT_PAGE)
                .select("#actions-select-multiple");
        Object val = browser.value("#actions-select-multiple");
        assertNotNull(val);
        assertTrue(val.toString().length() > 0);
    }

    @Test
    void test_navigation() {
        String next = alt();
        String play = fixture();

        browser.visit(play)
                .assertUrlIs(play)
                .visit(next)
                .assertUrlIs(next)
                .back()
                .assertUrlIs(play)
                .forward()
                .assertUrlIs(next)
                .refresh()
                .assertUrlIs(next);
    }

    @Test
    void test_resize() {
        browser.setContent("<p>Resize me</p>");

        browser.resize(300, 400);
        var vp1 = browser.viewport();
        assertEquals(300, ((Number) vp1.get("width")).intValue());
        assertEquals(400, ((Number) vp1.get("height")).intValue());

        browser.resize(600, 800);
        var vp2 = browser.viewport();
        assertEquals(600, ((Number) vp2.get("width")).intValue());
        assertEquals(800, ((Number) vp2.get("height")).intValue());
    }

    @Test
    void test_interacts_with_cookies() {
        // Cookies need a real origin
        browser.visit(fixture());

        // Set a cookie and assert value. The cookie shape is { name, value, (optional) expires }
        long tomorrowEpoch = Instant.now().plusSeconds(86400).getEpochSecond();
        browser.setCookie(new Object[]{
                Map.of("name", "encrypted", "value", "1234", "expires", tomorrowEpoch)
        }).assertCookieValue("encrypted", "1234");
    }

    @Test
    void test_concern_makes_assertions() {
        // Cookies need a real origin, so set the page on the fixture origin
        browser.visit(fixture())
                .setContent(ASSERTIONS_PAGE)
                .assertTitle("Assertions | Puth")
                .assertTitleContains("Assertions")
                // Cookie assertions
                .assertCookieValue("non-existing", "")
                // Plain cookie round trip
                .setCookie(new Object[]{Map.of("name", "plain", "value", "1234")})
                .assertCookieValue("plain", "1234")
                .assertHasCookie("plain")
                .deleteCookie("plain")
                .assertCookieMissing("plain")
                // Another cookie
                .setCookie(new Object[]{Map.of("name", "test", "value", "5678")})
                .assertHasCookie("test")
                .assertCookieValue("test", "5678")
                .deleteCookie("test")
                .assertCookieMissing("test")
                // Visibility / text assertions
                .assertSee("assertions page")
                .assertSeeIn(".querying-get", "Div")
                .assertSeeIn(".example", "Div")
                .assertDontSee("This text does not exists")
                .assertDontSeeIn(".querying-get", "This text does not exists")
                // JS and source assertions
                .assertScript("1+1", 2)
                .assertSourceHas("<title>Assertions | Puth</title>")
                .assertSourceMissing("<div>__not in dom__</div>")
                // Link assertions
                .assertSeeLink(alt())
                .assertDontSeeLink("https://notalink.io")
                // Presence / absence
                .assertVisible(".navbar")
                .assertPresent(".navbar")
                .assertNotPresent("#not-existing-element")
                .assertMissing("missingelement")
                // Input value / selection controls
                .assertInputValue("#properties-value input", "input with value")
                .assertInputValueIsNot("#properties-value input", "not the correct value")
                .check("#action-checkbox")
                .assertChecked("#action-checkbox")
                .uncheck("#action-checkbox", "test-1234")
                .assertNotChecked("#action-checkbox")
                .radio("action-radio", "orange")
                .assertRadioSelected("action-radio", "orange")
                .assertRadioNotSelected("action-radio", "apple")
                .select("#actions-select-multiple", new String[]{"apple", "orange"})
                .assertSelected("#actions-select-multiple", new String[]{"apple", "orange"})
                .assertNotSelected("#actions-select-multiple", "not-selected")
                .assertSelectHasOptions("#actions-select-multiple", new String[]{"apple", "orange"})
                .assertSelectMissingOptions("#actions-select-multiple", new String[]{"not-an-options"})
                .assertSelectHasOption("#actions-select-multiple", "orange")
                .assertSelectMissingOption("#actions-select-multiple", "not-an-options")
                // Typing and attributes
                .type("#actions-type input", "test-1234")
                .assertValue("#actions-type input", "test-1234")
                .append("#actions-type input", "-")
                .assertValueIsNot("#actions-type input", "test-1234")
                .assertAttribute("#actions-type input", "type", "text")
                .assertDataAttribute("#properties-attributes", "test", "1234")
                .assertAriaAttribute("#properties-attributes", "rowspan", "5678")
                .assertEnabled("#actions-focus")
                .assertDisabled("#actions-click-disabled")
                .assertButtonDisabled("#actions-click-disabled")
                .assertButtonEnabled("#actions-click-double")
                .assertButtonEnabled("double click")
                .click("#actions-focus")
                .assertFocused("#actions-focus")
                .assertNotFocused("#actions-type input");

        // Direct getters parity checks
        assertEquals("test-1234-", browser.value("#actions-type input"));
        assertEquals("Div with id querying-get", browser.text("#querying-get"));
        assertEquals("text", browser.attribute("#actions-focus", "type"));
    }

    @Test
    void test_concern_makes_assertions_inverse() {
        browser.setContent(ASSERTIONS_PAGE);
        browser.setTimeout(500);

        expectFailContains("Did not see expected text [This text does not exists] within element [.querying-get]",
                () -> browser.assertSeeIn(".querying-get", "This text does not exists"));
        expectFailContains("Saw unexpected text [Div] within element [.querying-get]",
                () -> browser.assertDontSeeIn(".querying-get", "Div"));
        expectFailContains("JavaScript expression [1+1] mismatched",
                () -> browser.assertScript("1+1", 3));
        expectFailContains("Did not find expected source code [<div>__not in dom__</div>]",
                () -> browser.assertSourceHas("<div>__not in dom__</div>"));
        expectFailContains("Found unexpected source code [<title>Assertions | Puth</title>]",
                () -> browser.assertSourceMissing("<title>Assertions | Puth</title>"));

        expectFailContains("Waited 500ms for selector [body a[href='https://notalink.io/']]",
                () -> browser.assertSeeLink("https://notalink.io/"));
        expectFailContains("Waited 500ms for selector [body #not-existing-element]",
                () -> browser.assertVisible("body #not-existing-element"));
    }

    @Test
    void test_assert_see_anything_exception() {
        browser.setContent("<div id=\"querying-empty-div\"></div>");
        assertThrows(AssertionFailedError.class, () -> browser.assertSeeAnythingIn("#querying-empty-div"));
    }

    @Test
    void test_concern_makes_url_assertions() {
        var fixture = java.net.URI.create(fixture());

        browser.visit(fixture() + "first/second?param1=abc#starts-1234")
                .assertUrlIs(fixture() + "first/second")
                .assertSchemeIs(fixture.getScheme())
                .assertSchemeIsNot("ftp")
                .assertHostIs(fixture.getHost())
                .assertHostIsNot("not.the.host")
                .assertPortIs(String.valueOf(fixture.getPort()))
                .assertPortIsNot("12345")
                .assertPathIs("/first/second")
                .assertPathBeginsWith("/first")
                .assertPathEndsWith("/second")
                .assertPathContains("st/se")
                .assertPathIsNot("/not-path")
                .assertFragmentIs("starts-1234")
                .assertFragmentBeginsWith("starts")
                .assertFragmentIsNot("test-not")
                .assertQueryStringHas("param1")
                .assertQueryStringHas("param1", "abc")
                .assertQueryStringMissing("test");
    }

    @Test
    void test_wait_for_function_target_change() {
        var first = fixture() + "first/second?param1=abc#starts-1234";
        var second = fixture();

        browser.visit(first)
                .assertUrlIs(first)
                .evaluate(String.format("setTimeout(_ => window.location.href = '%s', 250)", second));
        browser.assertUrlIs(second)
                .assertSee("Puth fixture");
    }

    @Test
    void test_concerns_interacts_with_elements_values() {
        browser.setContent("""
                        <div id="querying-get">Div with id querying-get</div>
                        <div id="actions-type"><input type="text"></div>
                        <input id="actions-focus" type="text">
                        """)
                .value("#actions-type input", "test-1234")
                .assertValue("#actions-type input", "test-1234")
                .assertAttribute("#actions-focus", "type", "text")
                .assertAttributeMissing("#actions-focus", "missing-attribute")
                .assertAttributeContains("#actions-focus", "type", "xt")
                .assertAttributeDoesntContain("#actions-focus", "type", "wrong-value");

        assertEquals("test-1234", browser.value("#actions-type input"));
        assertEquals("Div with id querying-get", browser.text("#querying-get"));
        assertEquals("text", browser.attribute("#actions-focus", "type"));

        browser.type("#actions-focus", "12")
                .assertValue("#actions-focus", "12")
                .type("#actions-focus", "34")
                .assertValue("#actions-focus", "34")
                .typeSlowly("#actions-focus", "56")
                .assertValue("#actions-focus", "56")
                .append("#actions-focus", "78")
                .assertValue("#actions-focus", "5678")
                .appendSlowly("#actions-focus", "90")
                .assertValue("#actions-focus", "567890")
                .clear("#actions-focus")
                .assertValue("#actions-focus", "");
    }

    private static void expectFailContains(String needle, Runnable r) {
        AssertionError thrown = assertThrows(AssertionFailedError.class, r::run);
        String msg = thrown.getMessage() == null ? "" : thrown.getMessage();
        if (!msg.contains(needle)) {
            fail("Failed asserting that error message contains [" + needle + "], got: " + msg);
        }
    }
}
