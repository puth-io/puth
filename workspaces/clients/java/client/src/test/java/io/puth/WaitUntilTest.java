package io.puth;

import org.junit.jupiter.api.Test;

public class WaitUntilTest extends BaseTest {

    @Test
    void test_wait_until() {
        browser.setContent("""
                        <div id="missing-container"><div id="missing-item">click button to hide this element</div></div>
                        <button id="hide" onclick="let c = document.querySelector('#missing-container'); let item = c.firstElementChild; item.remove(); setTimeout(() => c.appendChild(item), 2000)">hide</button>

                        <div id="present-container"></div>
                        <button id="show" onclick="let c = document.querySelector('#present-container'); c.innerHTML = '<div id=&quot;present-item&quot;>clicked button to show this element</div>'; setTimeout(() => c.innerHTML = '', 2000)">show</button>

                        <button id="disabled" disabled>disabled</button>
                        <button id="wait" onclick="let a = document.querySelector('#disabled'); this.disabled = true; a.disabled = false; setTimeout(() => { this.disabled = false; a.disabled = true; }, 2000)">click and wait</button>
                        """)
                .click("#hide")
                .waitUntilMissing("#missing-item")
                .waitFor("#missing-item")
                .click("#hide")
                .waitUntilMissingText("click button to hide this element")
                .waitForText("click button to hide this element")
                .waitForText("CLICK BUTTON TO HIDE THIS ELEMENT", 500, true)
                .click("#hide")
                .waitUntilMissingText("click button to hide this element")
                .waitForTextIn("#missing-container", "click button to hide this element")
                .waitForTextIn("#missing-container", "CLICK BUTTON TO HIDE THIS ELEMENT", 500, true) // ignoreCase: true
                .click("#show")
                .waitFor("#present-item")
                .waitUntilMissing("#present-item")
                .click("#show")
                .waitForText("clicked button to show this element")
                .waitUntilMissingText("clicked button to show this element")
                .click("#wait")
                .waitUntilDisabled("#wait")
                .waitUntilEnabled("#wait")
                .click("#wait")
                .waitUntilEnabled("#disabled")
                .waitUntilDisabled("#disabled");
    }
}
