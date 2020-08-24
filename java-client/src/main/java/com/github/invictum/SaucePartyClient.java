package com.github.invictum;

import org.openqa.selenium.Capabilities;
import org.openqa.selenium.ImmutableCapabilities;
import org.openqa.selenium.WebDriver;

import java.net.URL;
import java.util.function.BiFunction;

/**
 * Client used to request tickets from sauce-party server and build {@link WebDriver} instance
 */
public class SaucePartyClient<T extends WebDriver> {

    private final Settings settings;
    private final SocketQueue socketQueue;
    private final BiFunction<URL, Capabilities, T> factory;

    public SaucePartyClient(String host, BiFunction<URL, Capabilities, T> factory) {
        settings = new Settings(host);
        this.factory = factory;
        socketQueue = new SocketQueue(settings);
        try {
            if (!socketQueue.connectBlocking()) {
                throw new IllegalStateException("Failed to connect to sauce party");
            }
        } catch (InterruptedException e) {
            throw new IllegalStateException("Connection to sauce-party was interrupted", e);
        }
    }

    /**
     * Requests single driver instance
     */
    public T request() {
        return socketQueue.requestTicket().map(ticket -> {
            Capabilities capabilities = new ImmutableCapabilities("ticket", ticket);
            return factory.apply(settings.hub, capabilities);
        }).orElseThrow(() -> new RuntimeException("Unable to obtain a ticket"));
    }

    /**
     * Stops client and disconnects from sauce party server
     */
    public void shutdown() {
        socketQueue.closeConnection(1000, "bye");
    }
}
