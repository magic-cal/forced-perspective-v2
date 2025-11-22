import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import { TestFlipPage } from "./pages/TestFlipPage";
import "./index.css";
import { SocketProvider } from "@/sockets/SocketProvider";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <SocketProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/test-flip" element={<TestFlipPage />} />
        </Routes>
      </SocketProvider>
    </BrowserRouter>
  </React.StrictMode>
);
