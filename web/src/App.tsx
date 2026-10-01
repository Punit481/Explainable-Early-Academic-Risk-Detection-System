import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider, RequireAuth } from './auth'
import { Layout } from './components/Layout'
import { ClassesPage } from './pages/ClassesPage'
import { ClassPage } from './pages/ClassPage'
import { LoginPage } from './pages/LoginPage'
import { StudentPage } from './pages/StudentPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

// Separate from App so tests can render the routes inside a MemoryRouter
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Everything else needs a logged-in teacher */}
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<ClassesPage />} />
        <Route path="classes/:id" element={<ClassPage />} />
        <Route path="students/:id" element={<StudentPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
