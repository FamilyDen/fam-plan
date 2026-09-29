import './App.css'

import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout.tsx";
import RequireAuth from "./components/RequireAuth.tsx";
import Home from "./pages/Home.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import KioskSettings from "./pages/KioskSettings.tsx";
import KioskUnlock from "./pages/KioskUnlock.tsx";
import SwitchAccount from "./pages/SwitchAccount.tsx";

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
              <Route path="kiosk" element={<RequireAuth><KioskSettings /></RequireAuth>} />
              <Route path="kiosk/unlock" element={<RequireAuth><KioskUnlock /></RequireAuth>} />
              <Route path="switch" element={<SwitchAccount />} />
              <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
      </Routes>
  )
}

export default App
