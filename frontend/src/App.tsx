import { BrowserRouter as Router, Routes, Route, useSearchParams } from 'react-router-dom';
import UserApp from './UserApp';
import AdminApp from './AdminApp';

function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const isAdmin = urlParams.get('admin') === 'true';

  return (
    <Router>
      <Routes>
        <Route path="/" element={isAdmin ? <AdminApp /> : <UserApp />} />
      </Routes>
    </Router>
  );
}

export default App;
