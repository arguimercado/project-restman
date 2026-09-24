import { Route, Routes } from "react-router-dom";
import { ProjectsPage } from "./pages/ProjectsPage";
import { ProjectWorkspace } from "./pages/ProjectWorkspace";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectsPage />} />
      <Route path="/projects/:projectId" element={<ProjectWorkspace />} />
    </Routes>
  );
}
