import { useEffect } from "react";
import { useDesignerStore } from "../store/designerStore";
import type { Project } from "../types/widgets";
import { parseProjectJson, serializeProject } from "../utils/projectSerialization";

const AUTOSAVE_KEY = "tk-designer-autosave";
const AUTOSAVE_INTERVAL_MS = 30000;

export function writeAutosave(project: Project) {
  try {
    localStorage.setItem(AUTOSAVE_KEY, serializeProject(project));
  } catch {
    // Autosave is best-effort; failed writes should not block project loading.
  }
}

export function useAutosave() {
  useEffect(() => {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (!saved) return;

    try {
      useDesignerStore.getState().loadProject(parseProjectJson(saved));
    } catch {
      // Ignore corrupt autosave data so the app can start with a clean project.
    }
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const project = useDesignerStore.getState().exportProject();
      writeAutosave(project);
    }, AUTOSAVE_INTERVAL_MS);

    return () => window.clearInterval(interval);
  }, []);
}
