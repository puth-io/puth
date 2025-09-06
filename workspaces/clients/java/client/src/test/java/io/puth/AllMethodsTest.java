package io.puth;

import io.puth.client.Context;
import io.puth.client.RemoteObject;
import io.puth.client.remote.Browser;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

public class AllMethodsTest {

    private Context context;
    private Browser browser;

    private void setup() {
        context = new Context("http://127.0.0.1:7345", Map.of(
                "test", Map.of("name", "AllMethodsTest"),
                "snapshot", true,
                "debug", false
        ));
        browser = context.createBrowserShim();
    }

    @AfterEach
    void tearDown() {
        if (browser != null) {
            try { browser.quit(); } catch (Exception ignored) {}
        }
        if (context != null) {
            try { context.destroy(Map.of()); } catch (Exception ignored) {}
        }
    }

    private static String playground() {
        return "https://playground.puth.dev/";
    }

    @Test
    void test_querying_elements() {
        setup();
        browser.visit(playground());

        RemoteObject[] els = browser.findAll(".querying-get");
        assertEquals(2, els.length, "Expected 2 elements with class .querying-get");

        RemoteObject[] idOne = browser.findAll("#querying-get");
        assertEquals(1, idOne.length, "Expected 1 element with id #querying-get");
    }

    @Test
    void test_press() {
        setup();
        browser.visit(playground())
               .press("click me")
               .assertSeeIn("#actions-click-verify", "clicked button")
               .pressAndWaitFor("click and wait")
               .assertButtonEnabled("click and wait");
    }

    @Test
    void test_select() {
        setup();
        browser.visit(playground())
               .select("#actions-select-multiple", new String[]{"apple", "orange"})
               .assertSelected("#actions-select-multiple", new String[]{"apple", "orange"})
               .select("#actions-select-multiple", "orange")
               .assertSelected("#actions-select-multiple", "orange")
               .assertSelected("#actions-select", "")
               .select("#actions-select", "orange")
               .assertSelected("#actions-select", "orange");

        browser.visit(playground())
               .select("#actions-select-multiple");
        Object val = browser.value("#actions-select-multiple");
        assertNotNull(val);
        assertTrue(val.toString().length() > 0);
    }

    @Test
    void test_navigation() {
        setup();
        String next = "https://puth.io/";
        String play = playground();

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
        setup();
        browser.visit(playground());

        browser.resize(300, 400);
        Map<?, ?> vp1 = asMap(browser.viewport());
        assertEquals(300, ((Number) vp1.get("width")).intValue());
        assertEquals(400, ((Number) vp1.get("height")).intValue());

        browser.resize(600, 800);
        Map<?, ?> vp2 = asMap(browser.viewport());
        assertEquals(600, ((Number) vp2.get("width")).intValue());
        assertEquals(800, ((Number) vp2.get("height")).intValue());
    }

    @Test
    void test_interacts_with_cookies() {
        setup();
        browser.visit(playground());

        // Set a cookie and assert value. The cookie shape is { name, value, (optional) expires }
        long tomorrowEpoch = Instant.now().plusSeconds(86400).getEpochSecond();
        browser.setCookie(new Object[] {
                Map.of("name", "encrypted", "value", "1234", "expires", tomorrowEpoch)
        })._assertCookieValue("encrypted", "1234");
    }

    @Test
    void test_concern_makes_assertions() {
        setup();
        browser.visit(playground())
               .assertTitle("Playground | Puth")
               .assertTitleContains("Playground")
               // Cookie assertions
               ._assertCookieValue("non-existing", "")
               // Plain cookie round trip
               .setCookie(new Object[]{ Map.of("name", "plain", "value", "1234") })
               ._assertCookieValue("plain", "1234")
               ._assertHasCookie("plain")
               .deleteCookie(List.of("plain"))
               ._assertCookieMissing("plain")
               // Another cookie
               .setCookie(new Object[]{ Map.of("name", "test", "value", "5678") })
               ._assertHasCookie("test")
               ._assertCookieValue("test", "5678")
               .deleteCookie(List.of("test"))
               ._assertCookieMissing("test")
               // Visibility / text assertions
               .assertSee("playground")
               .assertSeeIn(".querying-get", "Div")
               .assertSeeIn(".example", "Div")
               .assertDontSee("This text does not exists")
               .assertDontSeeIn(".querying-get", "This text does not exists")
               // JS and source assertions
               .assertScript("1+1", 2)
               .assertSourceHas("<title>Playground | Puth</title>")
               .assertSourceMissing("<div>__not in dom__</div>")
               // Link assertions
               .assertSeeLink("https://puth.io/")
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
        setup();
        browser.visit(playground());
        //browser.timeout = 500;
        //browser.functionTimeoutMultiplier = 1;

        expectFailContains("Did not see expected text [This text does not exists] within element [.querying-get]",
                () -> browser.assertSeeIn(".querying-get", "This text does not exists"));
        expectFailContains("Saw unexpected text [Div] within element [.querying-get]",
                () -> browser.assertDontSeeIn(".querying-get", "Div"));
        expectFailContains("JavaScript expression [1+1] mismatched",
                () -> browser.assertScript("1+1", 3));
        expectFailContains("Did not find expected source code [<div>__not in dom__</div>]",
                () -> browser.assertSourceHas("<div>__not in dom__</div>"));
        expectFailContains("Found unexpected source code [<title>Playground | Puth</title>]",
                () -> browser.assertSourceMissing("<title>Playground | Puth</title>"));

        expectFailContains("Waited 500ms for selector [body a[href='https://notalink.io/']]", 
                () -> browser.assertSeeLink("https://notalink.io/"));
        expectFailContains("Waited 500ms for selector [body body #not-existing-element]",
                () -> browser.assertVisible("body #not-existing-element"));
    }

    @Test
    void test_assert_see_anything_exception() {
        setup();
        browser.visit(playground());
        assertThrows(AssertionError.class, () -> browser.assertSeeAnythingIn("#querying-empty-div"));
    }

    @Test
    void test_concern_makes_url_assertions() {
        setup();
        browser.visit("https://playground.puth.dev/first/second?param1=abc#starts-1234")
               .assertUrlIs("https://playground.puth.dev/first/second")
               .assertSchemeIs("https")
               .assertSchemeIsNot("http")
               .assertHostIs("playground.puth.dev")
               .assertHostIsNot("not.the.host")
               .assertPortIs("443")
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
    void test_wip() {
        setup();
        browser.visit("https://playground.puth.dev/first/second?param1=abc#starts-1234")
               .evaluate("setTimeout(_ => window.location.href = \"https://puth.io\", 250)");
        browser.assertUrlIs("https://puth.io/");
    }

    @Test
    void test_concerns_interacts_with_elements_values() {
        setup();
        /*browser.visit(playground())
               .value("#actions-type input", "test-1234")
               .assertValue("#actions-type input", "test-1234")
               .assertAttribute("#actions-focus", "type", "text")
               .assertAttributeMissing("#actions-focus", "missing-attribute")
               .assertAttributeContains("#actions-focus", "type", "xt")
               .assertAttributeDoesntContain("#actions-focus", "type", "wrong-value");

        assertEquals("test-1234", browser.value("#actions-type input"));
        assertEquals("Div with id querying-get", browser.text("#querying-get"));
        assertEquals("text", browser.attribute("#actions-focus", "type"));*/

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

    // Helpers

    @SuppressWarnings("unchecked")
    private static Map<String, Object> asMap(Object o) {
        assertNotNull(o, "Expected a non-null viewport/bounds object");
        assertTrue(o instanceof Map, "Expected viewport/bounds to be a Map");
        return (Map<String, Object>) o;
    }

    private static void expectFailContains(String needle, Runnable r) {
        AssertionError thrown = assertThrows(AssertionError.class, r::run);
        String msg = thrown.getMessage() == null ? "" : thrown.getMessage();
        if (!msg.contains(needle)) {
            fail("Failed asserting that error message contains [" + needle + "], got: " + msg);
        }
    }
}
