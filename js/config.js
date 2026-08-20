/**
 * Local fallback configuration.
 * Docker deployments overwrite this file at container startup.
 */
window.RatelConfig = {
    serverAddress: "game.isnico.com:9998:Nico[v50]",
    wsAddress: window.location.protocol === "https:"
        ? "wss://game.isnico.com:9998/ws"
        : "ws://game.isnico.com:9998/ws",
    isDevelopment: true
};
