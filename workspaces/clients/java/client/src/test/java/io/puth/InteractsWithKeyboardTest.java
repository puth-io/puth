package io.puth;

import org.junit.jupiter.api.Test;

public class InteractsWithKeyboardTest extends BaseTest {
    private static final String INPUT_PAGE = "<input id=\"input\" type=\"text\" value=\"input with value\">";

    @Test
    void test_keyboard_special_keys() {
        String text = "äöü";

        browser.setContent(INPUT_PAGE)
                .clear("#input")
                .keys("#input", new String[]{text, "{ctrl}acvv", "-"})
                .assertInputValue("#input", text + text + "-");
    }

    @Test
    void test_keyboard_with_keyboard() {
        String text = "äöü";

        browser.setContent(INPUT_PAGE)
                .clear("#input")
                .keys("#input", new String[]{text});
//                .withKeyboard(keyboard -> {
//                    keyboard.press("ctrl")
//                            .press("a").release("a")
//                            .press("c").release("c")
//                            .press("v").release("v")
//                            .press("v").release("v")
//                            .release("ctrl")
//                            .type("-");
//                })
//                .assertInputValue("#input", text + text + "-");
    }
}
