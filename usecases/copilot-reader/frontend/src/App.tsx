import { BrowserRouter, Routes, Route } from "react-router-dom";
import Library from "./pages/Library";
import Reader from "./pages/Reader";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Library />} />
        <Route path="/read/:bookId" element={<Reader />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
