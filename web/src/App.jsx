import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, RequireRole } from "./lib/auth.jsx";
import HomePage from "./pages/HomePage.jsx";
import StaffLoginPage from "./pages/StaffLoginPage.jsx";
import ClientMenuPage from "./pages/client/ClientMenuPage.jsx";
import KitchenPage from "./pages/kitchen/KitchenPage.jsx";
import WaiterPage from "./pages/waiter/WaiterPage.jsx";
import AdminLayout from "./pages/admin/AdminLayout.jsx";
import AdminMenuPage from "./pages/admin/AdminMenuPage.jsx";
import AdminTablesPage from "./pages/admin/AdminTablesPage.jsx";
import AdminStaffPage from "./pages/admin/AdminStaffPage.jsx";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage.jsx";
import AdminHistoryPage from "./pages/admin/AdminHistoryPage.jsx";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/t/:qrToken" element={<ClientMenuPage />} />
        <Route path="/staff/login" element={<StaffLoginPage />} />

        <Route
          path="/kitchen"
          element={
            <RequireRole roles={["admin", "kitchen"]}>
              <KitchenPage />
            </RequireRole>
          }
        />
        <Route
          path="/waiter"
          element={
            <RequireRole roles={["admin", "waiter"]}>
              <WaiterPage />
            </RequireRole>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireRole roles={["admin"]}>
              <AdminLayout />
            </RequireRole>
          }
        >
          <Route index element={<Navigate to="menu" replace />} />
          <Route path="menu" element={<AdminMenuPage />} />
          <Route path="tables" element={<AdminTablesPage />} />
          <Route path="staff" element={<AdminStaffPage />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="history" element={<AdminHistoryPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
