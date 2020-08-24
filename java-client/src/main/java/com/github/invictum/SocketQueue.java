package com.github.invictum;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Optional;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Hybrid socket client that manages requester threads in queue and distribute tickets
 */
public class SocketQueue extends WebSocketClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(SocketQueue.class);
    private static final Pattern TICKET_MESSAGE = Pattern.compile("^ticket\\|(.+?)\\|\\d*?$");
    private static final Pattern HEARTBEAT_MESSAGE = Pattern.compile("^heartbeat\\|(\\d+)$");

    private final LinkedBlockingQueue<Node> queue = new LinkedBlockingQueue<>();
    private final Settings settings;

    public SocketQueue(Settings settings) {
        super(settings.socket);
        this.settings = settings;
    }

    @Override
    public void onOpen(ServerHandshake handshakeData) {
        LOGGER.info("Connected to sauce-party server");
    }

    @Override
    public void onMessage(String message) {
        LOGGER.debug("Message: {}", message);
        Matcher heartbeat = HEARTBEAT_MESSAGE.matcher(message);
        if (heartbeat.find()) {
            setHeartbeat(heartbeat.group(1));
            return;
        }
        Matcher ticket = TICKET_MESSAGE.matcher(message);
        if (ticket.find()) {
            offerTicket(ticket.group(1));
        }
    }

    @Override
    public void onClose(int code, String reason, boolean remote) {
        LOGGER.info("Disconnected from sauce-party server");
        LOGGER.debug("Closed by {}, {} - {}", (remote ? "server" : "client"), code, reason);
    }

    @Override
    public void onError(Exception ex) {
        LOGGER.error("Connection error: {}", ex);
    }

    private void setHeartbeat(String time) {
        int heartbeatInMillis = settings.heartBeatInterval;
        try {
            heartbeatInMillis = Integer.parseInt(time);
        } catch (NumberFormatException e) {
            LOGGER.warn("Unable to parse heartbeat timeout. Fall back to default value");
        }
        long heartbeat = TimeUnit.MILLISECONDS.toSeconds(heartbeatInMillis);
        this.setConnectionLostTimeout((int) heartbeat);
        LOGGER.debug("Heartbeat: {} seconds", heartbeat);
    }

    /**
     * Sends ticket request and blocks until ticket became available or wait will be interrupted
     *
     * @return optional that might contain obtained ticket
     */
    public Optional<String> requestTicket() {
        Node node = new Node();
        synchronized (node.sync) {
            queue.offer(node);
            send("session");
            try {
                node.sync.wait();
            } catch (InterruptedException e) {
                throw new RuntimeException("Ticket wait was interrupted", e);
            }
        }
        return Optional.ofNullable(node.ticket);
    }

    private void offerTicket(String ticket) {
        Node node = queue.poll();
        if (node != null) {
            node.ticket = ticket;
            synchronized (node.sync) {
                node.sync.notify();
            }
        }
    }

    /**
     * Storage that contains sync object as well as potential ticket value
     */
    private static final class Node {
        private final Object sync = new Object();
        private String ticket;
    }
}
