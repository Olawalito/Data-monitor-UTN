import Dashboard from "./pages/dashboard";
import Login from "./pages/Login";
import { Routes,Route } from "react-router-dom";
import ProtectedRoute from "./auth/ProtectedRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login/>}/>
      <Route element={<ProtectedRoute/>}>
        <Route path="/dashboard" element={<Dashboard/>}/>
      </Route>
    </Routes>
  )
}

export default App
