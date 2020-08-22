package com.github.invictum;

import org.java_websocket.client.WebSocketClient;
import org.java_websocket.handshake.ServerHandshake;

import java.net.URI;
import java.util.Optional;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class SocketQueue extends WebSocketClient {

    private static final Pattern TICKET_MESSAGE = Pattern.compile("^ticket\\|(.+?)\\|\\d*?$");
    private static final Pattern HEARTBEAT_MESSAGE = Pattern.compile("^heartbeat\\|(\\d+)$");

    private final LinkedBlockingQueue<Node> queue = new LinkedBlockingQueue<>();

    public SocketQueue(URI serverUri) {
        super(serverUri);
    }

    @Override
    public void onOpen(ServerHandshake handshakeData) {
        System.out.println(handshakeData.getHttpStatus() + " " + handshakeData.getHttpStatusMessage());
    }

    @Override
    public void onMessage(String message) {
        Matcher heartbeat = HEARTBEAT_MESSAGE.matcher(message);
        if (heartbeat.find()) {
            setHeartbeat(heartbeat.group(1));
            return;
        }
        Matcher ticket = TICKET_MESSAGE.matcher(message);
        if (ticket.find()) {
            offerTicket(ticket.group(1));
            return;
        }
        System.out.println(message);
    }

    @Override
    public void onClose(int code, String reason, boolean remote) {
        System.out.println("Closed by " + (remote ? "server" : "client") + " - " + reason);
    }

    @Override
    public void onError(Exception ex) {
        ex.printStackTrace();
    }

    private void setHeartbeat(String time) {
        int heartbeatInMillis = 60000;
        try {
            heartbeatInMillis = Integer.parseInt(time);
        } catch (NumberFormatException e) {
            //
        }
        long heartbeat = TimeUnit.MILLISECONDS.toSeconds(heartbeatInMillis);
        this.setConnectionLostTimeout((int) heartbeat);
    }

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

    private static class Node {
        private final Object sync = new Object();
        private String ticket;
    }
}
