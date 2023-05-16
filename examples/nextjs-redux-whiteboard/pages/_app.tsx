
import React from "react";
import ReactDOM from "react-dom";
import MyApp from "./index";
import { Provider } from "react-redux";
import store from "../src/store";

function App() {
  return (
  <React.StrictMode>
    <Provider store={store}>
      <MyApp />
    </Provider>
  </React.StrictMode>
  );
}

export default App;