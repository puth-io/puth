package io.puth;

import org.junit.jupiter.api.Test;

public class InteractsWithDialogTest extends BaseTest {
    @Test
    void test_dialogs() {
        browser.visit(playground())
                .click("#dialog-alert")
                .waitForDialog()
                .acceptDialog()
                // prompt
                .click("#dialog-prompt")
                .typeInDialog("prompt answer")
                .acceptDialog()
                .assertSee("Prompt text: prompt answer")
                // run twice to test type cache
                .click("#dialog-prompt")
                .typeInDialog("prompt answer2")
                .acceptDialog()
                .assertSee("Prompt text: prompt answer2")
                // accept with value
                .click("#dialog-prompt")
                .acceptDialog("prompt answer3")
                .assertSee("Prompt text: prompt answer3")
                // confirm
                .click("#dialog-confirm")
                .assertDialogOpened("confirm this")
                .acceptDialog()
                .assertSee("confirm value: true")
                // confirm
                .click("#dialog-confirm")
                .dismissDialog()
                .assertSee("confirm value: false");
    }
}
