use wasm_bindgen::prelude::*;

/// Callbacks provided by the JS room layer to the WASM module.
/// These are stored as JS closures and called back from Rust.
#[wasm_bindgen]
pub struct PoolCallbacks {
    room_id: String,
    generate_id: js_sys::Function,
    generate_op_id: js_sys::Function,
    dispatch: js_sys::Function,
    assert_storage_is_writable: js_sys::Function,
}

#[wasm_bindgen]
impl PoolCallbacks {
    #[wasm_bindgen(constructor)]
    pub fn new(
        room_id: String,
        generate_id: js_sys::Function,
        generate_op_id: js_sys::Function,
        dispatch: js_sys::Function,
        assert_storage_is_writable: js_sys::Function,
    ) -> Self {
        Self {
            room_id,
            generate_id,
            generate_op_id,
            dispatch,
            assert_storage_is_writable,
        }
    }
}

impl PoolCallbacks {
    pub fn room_id(&self) -> &str {
        &self.room_id
    }

    pub fn call_generate_id(&self) -> Result<String, JsValue> {
        let result = self.generate_id.call0(&JsValue::NULL)?;
        result
            .as_string()
            .ok_or_else(|| JsValue::from_str("generateId did not return a string"))
    }

    pub fn call_generate_op_id(&self) -> Result<String, JsValue> {
        let result = self.generate_op_id.call0(&JsValue::NULL)?;
        result
            .as_string()
            .ok_or_else(|| JsValue::from_str("generateOpId did not return a string"))
    }

    pub fn call_dispatch(&self, ops: &JsValue) -> Result<(), JsValue> {
        self.dispatch.call1(&JsValue::NULL, ops)?;
        Ok(())
    }

    pub fn call_assert_storage_is_writable(&self) -> Result<(), JsValue> {
        self.assert_storage_is_writable.call0(&JsValue::NULL)?;
        Ok(())
    }
}
