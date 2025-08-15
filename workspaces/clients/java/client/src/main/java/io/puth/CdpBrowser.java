package io.puth;

public class CdpBrowser extends RemoteObject {
    public CdpBrowser(String id, String type, String represents, RemoteObject parent, Context context) {
        super(id, type, represents, parent, context);
    }

    public CdpBrowser visit(String url) {
        this.callFunction("visit", new Object[]{url});
        return this;
    }

    public String getTitle() {
        return (String) this.callFunction("getTitle", new Object[]{});
    }
}
