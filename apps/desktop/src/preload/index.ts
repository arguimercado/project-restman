// contextIsolation is on and nodeIntegration is off (Electron's defaults): the renderer is a
// sandboxed web page that only talks to the backend over HTTPS. Nothing needs bridging yet — this
// file exists so main's preload path resolves, and as the place to add a contextBridge API later.
