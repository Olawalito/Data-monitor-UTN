import Dashboard from "./pages/dashboard";
import Login from "./pages/Login";
import { Routes,Route } from "react-router-dom";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login/>}/>
      <Route path="/dashboard" element={<Dashboard/>}/>
    </Routes>
  )
}

export default App
