import './App.css'

import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.tsx";
import RequireAuth from "./components/RequireAuth.tsx";
import Home from "./pages/Home.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import KioskStart from "./pages/KioskStart.tsx";

function App() {

  return (
      <Routes>
          <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route
                  path="dashboard"
                  element={
                      <RequireAuth>
                          <Dashboard />
                      </RequireAuth>
                  }
              />
              <Route path="kiosk/start" element={<KioskStart />} />
              <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
      </Routes>
  )
}

export default App
