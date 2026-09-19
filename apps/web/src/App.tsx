import { Navigate, Route, Routes } from 'react-router-dom';

import { DesignSystemPage } from './DesignSystemPage';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/design-system" replace />} />
      <Route path="/design" element={<Navigate to="/design-system" replace />} />
      <Route path="/design-system" element={<DesignSystemPage />} />
    </Routes>
  );
}
