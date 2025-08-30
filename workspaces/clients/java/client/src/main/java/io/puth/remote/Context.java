package io.puth.remote;

import io.puth.RemoteObject;
import java.util.Map;

/**
* @codegen
*/
public class Context extends RemoteObject {
    public Context(String id, String type, String represents, RemoteObject parent, io.puth.Context context) {
        super(id, type, represents, parent, context);
    }

    public Browser createBrowserShim() {
        return this.createBrowserShim(Map.of(), Map.of());
    }

    public Browser createBrowserShim(Map<String, Object> options) {
        return this.createBrowserShim(options, Map.of());
    }

    public Browser createBrowserShim(Map<String, Object> options, Map<String, Object> shimOptions) {
        return (Browser) this.callFunc("createBrowserShim", new Object[]{options, shimOptions});
    }

    public Object[] getSnapshotsByType(Object type) {
        return (Object[]) this.callFunc("getSnapshotsByType", new Object[]{type});
    }

    public void testFailed() {
        this.callFunc("testFailed", new Object[]{});
    }

    public void testSuccess() {
        this.callFunc("testSuccess", new Object[]{});
    }

    public void testSucceeded() {
        this.callFunc("testSucceeded", new Object[]{});
    }

    public String saveTemporaryFile(Object name, Object content) {
        return (String) this.callFunc("saveTemporaryFile", new Object[]{name, content});
    }
}
