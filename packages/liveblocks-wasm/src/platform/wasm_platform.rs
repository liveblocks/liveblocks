//! WASM platform adapter using web-sys and js-sys.
//!
//! In the WASM target, the Room receives JS delegate functions for auth and
//! socket creation. This module wraps those JS-provided objects to implement
//! the platform traits.

use std::future::Future;
use std::pin::Pin;

use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;

use super::{
    HttpClient, HttpMethod, HttpRequest, HttpResponse, Timer, WebSocket, WebSocketConnector,
    WsEvent, WsEventReceiver,
};

// ---------------------------------------------------------------------------
// WebSocket (wrapping web-sys::WebSocket)
// ---------------------------------------------------------------------------

/// A WASM WebSocket wrapping a web-sys `WebSocket`.
pub struct WasmWebSocket {
    inner: web_sys::WebSocket,
}

impl WebSocket for WasmWebSocket {
    fn send_text(&mut self, data: &str) -> Result<(), String> {
        self.inner
            .send_with_str(data)
            .map_err(|e| format!("WebSocket send failed: {e:?}"))
    }

    fn close(&mut self) -> Result<(), String> {
        self.inner
            .close()
            .map_err(|e| format!("WebSocket close failed: {e:?}"))
    }
}

// WASM is single-threaded, so this is safe.
unsafe impl Send for WasmWebSocket {}

/// Event receiver backed by a futures_channel mpsc.
pub struct WasmWsEventReceiver {
    rx: futures_channel::mpsc::UnboundedReceiver<WsEvent>,
}

unsafe impl Send for WasmWsEventReceiver {}

impl WsEventReceiver for WasmWsEventReceiver {
    fn recv(&mut self) -> Pin<Box<dyn Future<Output = Option<WsEvent>> + '_>> {
        Box::pin(async move {
            use futures_util::StreamExt;
            self.rx.next().await
        })
    }
}

/// WASM WebSocket connector.
pub struct WasmWebSocketConnector;

unsafe impl Send for WasmWebSocketConnector {}
unsafe impl Sync for WasmWebSocketConnector {}

impl WebSocketConnector for WasmWebSocketConnector {
    type Socket = WasmWebSocket;
    type Receiver = WasmWsEventReceiver;

    fn connect(
        &self,
        url: &str,
    ) -> Pin<Box<dyn Future<Output = Result<(Self::Socket, Self::Receiver), String>> + '_>> {
        let url = url.to_string();
        Box::pin(async move {
            let ws = web_sys::WebSocket::new(&url)
                .map_err(|e| format!("WebSocket creation failed: {e:?}"))?;

            let (tx, rx) = futures_channel::mpsc::unbounded();

            // Set up event callbacks
            {
                let tx_open = tx.clone();
                let onopen = Closure::<dyn FnMut()>::new(move || {
                    let _ = tx_open.unbounded_send(WsEvent::Open);
                });
                ws.set_onopen(Some(onopen.as_ref().unchecked_ref()));
                onopen.forget();
            }

            {
                let tx_msg = tx.clone();
                let onmessage = Closure::<dyn FnMut(web_sys::MessageEvent)>::new(
                    move |event: web_sys::MessageEvent| {
                        if let Some(text) = event.data().as_string() {
                            let _ = tx_msg.unbounded_send(WsEvent::Message(text));
                        }
                    },
                );
                ws.set_onmessage(Some(onmessage.as_ref().unchecked_ref()));
                onmessage.forget();
            }

            {
                let tx_close = tx.clone();
                let onclose = Closure::<dyn FnMut(web_sys::CloseEvent)>::new(
                    move |event: web_sys::CloseEvent| {
                        let _ = tx_close.unbounded_send(WsEvent::Close {
                            code: event.code(),
                            reason: event.reason(),
                        });
                    },
                );
                ws.set_onclose(Some(onclose.as_ref().unchecked_ref()));
                onclose.forget();
            }

            {
                let tx_err = tx;
                let onerror = Closure::<dyn FnMut(web_sys::ErrorEvent)>::new(
                    move |event: web_sys::ErrorEvent| {
                        let _ = tx_err.unbounded_send(WsEvent::Error(event.message()));
                    },
                );
                ws.set_onerror(Some(onerror.as_ref().unchecked_ref()));
                onerror.forget();
            }

            Ok((WasmWebSocket { inner: ws }, WasmWsEventReceiver { rx }))
        })
    }
}

// ---------------------------------------------------------------------------
// HTTP (using web-sys fetch)
// ---------------------------------------------------------------------------

/// WASM HTTP client using the Fetch API.
pub struct WasmHttpClient;

unsafe impl Send for WasmHttpClient {}
unsafe impl Sync for WasmHttpClient {}

impl HttpClient for WasmHttpClient {
    fn request(
        &self,
        req: HttpRequest,
    ) -> Pin<Box<dyn Future<Output = Result<HttpResponse, String>> + '_>> {
        Box::pin(async move {
            use wasm_bindgen_futures::JsFuture;
            use web_sys::{RequestInit, RequestMode};

            let opts = RequestInit::new();
            let method_str = match req.method {
                HttpMethod::Get => "GET",
                HttpMethod::Post => "POST",
                HttpMethod::Put => "PUT",
                HttpMethod::Delete => "DELETE",
            };
            opts.set_method(method_str);
            opts.set_mode(RequestMode::Cors);

            if let Some(body) = &req.body {
                opts.set_body(&JsValue::from_str(body));
            }

            let request = web_sys::Request::new_with_str_and_init(&req.url, &opts)
                .map_err(|e| format!("Failed to create request: {e:?}"))?;

            for (key, value) in &req.headers {
                request
                    .headers()
                    .set(key, value)
                    .map_err(|e| format!("Failed to set header: {e:?}"))?;
            }

            let resp_value = JsFuture::from(
                web_sys::window()
                    .ok_or_else(|| "No global window".to_string())?
                    .fetch_with_request(&request),
            )
            .await
            .map_err(|e| format!("Fetch failed: {e:?}"))?;

            let resp: web_sys::Response = resp_value
                .dyn_into()
                .map_err(|_| "Response is not a Response object".to_string())?;

            let status = resp.status();
            let body = JsFuture::from(
                resp.text()
                    .map_err(|e| format!("Failed to get response text: {e:?}"))?,
            )
            .await
            .map_err(|e| format!("Failed to read response text: {e:?}"))?
            .as_string()
            .unwrap_or_default();

            Ok(HttpResponse { status, body })
        })
    }
}

// ---------------------------------------------------------------------------
// Timer (using setTimeout)
// ---------------------------------------------------------------------------

/// WASM timer using `setTimeout`.
pub struct WasmTimer;

unsafe impl Send for WasmTimer {}
unsafe impl Sync for WasmTimer {}

impl Timer for WasmTimer {
    fn delay(&self, delay_ms: u64) -> Pin<Box<dyn Future<Output = ()> + '_>> {
        Box::pin(async move {
            let promise = js_sys::Promise::new(&mut |resolve, _reject| {
                let _ = web_sys::window()
                    .expect("no global window")
                    .set_timeout_with_callback_and_timeout_and_arguments_0(
                        &resolve,
                        delay_ms as i32,
                    );
            });
            let _ = wasm_bindgen_futures::JsFuture::from(promise).await;
        })
    }
}
