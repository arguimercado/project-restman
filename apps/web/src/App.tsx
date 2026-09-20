import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppMenuBar } from "./components/AppMenuBar/AppMenuBar";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectWorkspace } from "./pages/ProjectWorkspace";

function AppLayout() {
  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      <AppMenuBar />
      <Outlet />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<ProjectsPage />} />
        <Route path="projects/:projectId" element={<ProjectWorkspace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
