//! Native platform adapter using tokio, tungstenite, and reqwest.

use std::future::Future;
use std::pin::Pin;

use futures_util::{SinkExt, StreamExt};
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::Message;

use super::{
    HttpClient, HttpMethod, HttpRequest, HttpResponse, Timer, WebSocket, WebSocketConnector,
    WsEvent, WsEventReceiver,
};

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------

/// A native WebSocket backed by tokio-tungstenite.
pub struct NativeWebSocket {
    sink: futures_util::stream::SplitSink<
        tokio_tungstenite::WebSocketStream<
            tokio_tungstenite::MaybeTlsStream<tokio::net::TcpStream>,
        >,
        Message,
    >,
}

impl WebSocket for NativeWebSocket {
    fn send_text(&mut self, data: &str) -> Result<(), String> {
        let msg = Message::Text(data.to_string());
        tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current()
                .block_on(self.sink.send(msg))
                .map_err(|e| format!("WebSocket send failed: {e}"))
        })
    }

    fn close(&mut self) -> Result<(), String> {
        tokio::task::block_in_place(|| {
            tokio::runtime::Handle::current()
                .block_on(self.sink.close())
                .map_err(|e| format!("WebSocket close failed: {e}"))
        })
    }
}

/// Event receiver backed by a tokio mpsc channel.
pub struct NativeWsEventReceiver {
    rx: mpsc::UnboundedReceiver<WsEvent>,
}

impl WsEventReceiver for NativeWsEventReceiver {
    fn recv(&mut self) -> Pin<Box<dyn Future<Output = Option<WsEvent>> + '_>> {
        Box::pin(async move { self.rx.recv().await })
    }
}

/// Native WebSocket connector using tokio-tungstenite.
pub struct NativeWebSocketConnector;

impl WebSocketConnector for NativeWebSocketConnector {
    type Socket = NativeWebSocket;
    type Receiver = NativeWsEventReceiver;

    fn connect(
        &self,
        url: &str,
    ) -> Pin<Box<dyn Future<Output = Result<(Self::Socket, Self::Receiver), String>> + '_>> {
        let url = url.to_string();
        Box::pin(async move {
            let (ws_stream, _response) = tokio_tungstenite::connect_async(&url)
                .await
                .map_err(|e| format!("WebSocket connect failed: {e}"))?;

            let (sink, mut stream) = ws_stream.split();
            let (tx, rx) = mpsc::unbounded_channel();

            // Send the Open event before spawning the reader task
            let _ = tx.send(WsEvent::Open);

            // Spawn a task to forward incoming messages to the channel
            tokio::spawn(async move {
                while let Some(msg_result) = stream.next().await {
                    let event = match msg_result {
                        Ok(Message::Text(text)) => WsEvent::Message(text),
                        Ok(Message::Close(frame)) => {
                            let (code, reason) = frame
                                .map(|f| (f.code.into(), f.reason.to_string()))
                                .unwrap_or((1000, String::new()));
                            WsEvent::Close { code, reason }
                        }
                        Ok(Message::Ping(_) | Message::Pong(_) | Message::Binary(_)) => continue,
                        Ok(Message::Frame(_)) => continue,
                        Err(e) => WsEvent::Error(format!("{e}")),
                    };
                    if tx.send(event).is_err() {
                        break; // receiver dropped
                    }
                }
            });

            Ok((NativeWebSocket { sink }, NativeWsEventReceiver { rx }))
        })
    }
}

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

/// Native HTTP client using reqwest.
pub struct NativeHttpClient {
    client: reqwest::Client,
}

impl NativeHttpClient {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::new(),
        }
    }
}

impl Default for NativeHttpClient {
    fn default() -> Self {
        Self::new()
    }
}

impl HttpClient for NativeHttpClient {
    fn request(
        &self,
        req: HttpRequest,
    ) -> Pin<Box<dyn Future<Output = Result<HttpResponse, String>> + '_>> {
        Box::pin(async move {
            let method = match req.method {
                HttpMethod::Get => reqwest::Method::GET,
                HttpMethod::Post => reqwest::Method::POST,
                HttpMethod::Put => reqwest::Method::PUT,
                HttpMethod::Delete => reqwest::Method::DELETE,
            };

            let mut builder = self.client.request(method, &req.url);
            for (key, value) in &req.headers {
                builder = builder.header(key, value);
            }
            if let Some(body) = req.body {
                builder = builder.body(body);
            }

            let response = builder
                .send()
                .await
                .map_err(|e| format!("HTTP request failed: {e}"))?;

            let status = response.status().as_u16();
            let body = response
                .text()
                .await
                .map_err(|e| format!("Failed to read response body: {e}"))?;

            Ok(HttpResponse { status, body })
        })
    }
}

// ---------------------------------------------------------------------------
// Timer
// ---------------------------------------------------------------------------

/// Native timer using tokio::time.
pub struct TokioTimer;

impl Timer for TokioTimer {
    fn delay(&self, delay_ms: u64) -> Pin<Box<dyn Future<Output = ()> + '_>> {
        Box::pin(async move {
            tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
        })
    }
}
