package space.pxls.server;

import io.undertow.server.handlers.resource.*;
import space.pxls.App;

import java.io.IOException;
import java.nio.file.Paths;

public class PxlsResourceManager implements ResourceManager {
    private ResourceManager resourceManager;
    private static PxlsResourceManager _instance = null;
    public static PxlsResourceManager getInstance() throws Exception {
        if (_instance == null) _instance = new PxlsResourceManager();
        return _instance;
    }

    private PxlsResourceManager() throws Exception {
        reinit();
    }

    public void reinit() throws Exception {
        String webRoot = App.getWebRoot(true);
        if (webRoot.toLowerCase().startsWith("resource:")) resourceManager = new ClassPathResourceManager(App.class.getClassLoader(), "public/");
        else if (webRoot.toLowerCase().startsWith("file:")) resourceManager = new PathResourceManager(Paths.get(webRoot.substring(5)));
        else throw new Exception("http.webRoot is configured incorrectly. expecting either resource: or file: handler, got: " + webRoot.substring(0, webRoot.indexOf(':')));
    }

    @Override
    public Resource getResource(String path) throws IOException {
        if (resourceManager != null) return resourceManager.getResource(path);
        return null;
    }

    @Override
    public boolean isResourceChangeListenerSupported() {
        if (resourceManager != null) return resourceManager.isResourceChangeListenerSupported();
        return false;
    }

    @Override
    public void registerResourceChangeListener(ResourceChangeListener listener) {
        if (resourceManager != null) resourceManager.registerResourceChangeListener(listener);
    }

    @Override
    public void removeResourceChangeListener(ResourceChangeListener listener) {
        if (resourceManager != null) resourceManager.removeResourceChangeListener(listener);
    }

    @Override
    public void close() throws IOException {
        if (resourceManager != null) resourceManager.close();
    }
}