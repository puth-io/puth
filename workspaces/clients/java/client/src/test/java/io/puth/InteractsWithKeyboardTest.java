package io.puth;

import org.junit.jupiter.api.Test;

public class InteractsWithKeyboardTest extends BaseTest {

    @Test
    void test_keyboard_special_keys() {
        String text = "äöü";

        browser.visit(playground())
                .clear("#properties-value input")
                .keys("#properties-value input", new String[]{text, "{ctrl}acvv", "-"})
                .assertInputValue("#properties-value input", text + text + "-");
    }

    @Test
    void test_keyboard_with_keyboard() {
        String text = "äöü";

        browser.visit(playground())
                .clear("#properties-value input")
                .keys("#properties-value input", new String[]{text});
//                .withKeyboard(keyboard -> {
//                    keyboard.press("ctrl")
//                            .press("a").release("a")
//                            .press("c").release("c")
//                            .press("v").release("v")
//                            .press("v").release("v")
//                            .release("ctrl")
//                            .type("-");
//                })
//                .assertInputValue("#properties-value input", text + text + "-");
    }
}
