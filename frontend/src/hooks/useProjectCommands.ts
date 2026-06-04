import { useCallback } from "react";
import { showToast } from "../components/toastBus";
import { useDesignerStore } from "../store/designerStore";
import type { OutputRecord } from "../types/output";
import { projectToApiPayload } from "../utils/projectPayload";

type AddOutput = (record: Omit<OutputRecord, "id" | "createdAt">) => void;

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function useProjectCommands(addOutput: AddOutput) {
  const addRecord = useCallback((record: Omit<OutputRecord, "id" | "createdAt">) => {
    addOutput(record);
  }, [addOutput]);

  const saveProject = useCallback(() => {
    const project = useDesignerStore.getState().exportProject();
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.name}.tkdesigner.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Project saved");
    addRecord({
      kind: "log",
      tone: "success",
      title: "Project saved",
      message: `${project.name}.tkdesigner.json downloaded.`,
    });
  }, [addRecord]);

  const loadProject = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.tkdesigner.json";
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        try {
          const project = JSON.parse(readerEvent.target?.result as string);
          useDesignerStore.getState().loadProject(project);
          showToast("Project loaded");
          addRecord({
            kind: "log",
            tone: "success",
            title: "Project loaded",
            message: file.name,
          });
        } catch {
          showToast("Invalid project file", "error");
          addRecord({
            kind: "log",
            tone: "error",
            title: "Load failed",
            message: `${file.name} is not a valid project file.`,
          });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [addRecord]);

  const validateProject = useCallback(async () => {
    const store = useDesignerStore.getState();
    const project = store.exportProject();
    try {
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectToApiPayload(project, store.tkTheme)),
      });
      const data = await response.json();
      const errors = Array.isArray(data.errors) ? data.errors : [];
      addRecord({
        kind: "validation",
        tone: errors.length > 0 ? "warning" : "success",
        title: errors.length > 0 ? `${errors.length} validation issues` : "Validation passed",
        message: errors.length > 0 ? "Review generated-code issues before export." : "No validation errors were reported.",
        details: errors,
      });
      showToast(errors.length > 0 ? `${errors.length} validation issues` : "Validation passed", errors.length > 0 ? "warning" : "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Validation request failed";
      addRecord({
        kind: "validation",
        tone: "error",
        title: "Validation failed",
        message,
      });
      showToast(`Validation failed: ${message}`, "error");
    }
  }, [addRecord]);

  const previewProject = useCallback(async () => {
    const store = useDesignerStore.getState();
    const project = store.exportProject();
    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectToApiPayload(project, store.tkTheme)),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
        throw new Error(errorBody.detail || `HTTP ${response.status}`);
      }
      const data = await response.json().catch(() => null);
      const message = data?.warning ?? "Tkinter preview launched.";
      addRecord({
        kind: "preview",
        tone: data?.warning ? "warning" : "success",
        title: data?.warning ? "Preview code only" : "Preview launched",
        message,
      });
      showToast(data?.warning ? data.warning : "Preview launched", data?.warning ? "warning" : "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Preview failed";
      addRecord({
        kind: "preview",
        tone: "error",
        title: "Preview failed",
        message,
      });
      showToast(`Preview failed: ${message}`, "error");
    }
  }, [addRecord]);

  const exportPython = useCallback(async () => {
    const store = useDesignerStore.getState();
    const project = store.exportProject();
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectToApiPayload(project, store.tkTheme)),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${project.name.replace(/ /g, "_")}.py`;
      anchor.click();
      URL.revokeObjectURL(url);
      addRecord({
        kind: "export",
        tone: "success",
        title: "Python exported",
        message: `${project.name.replace(/ /g, "_")}.py downloaded.`,
      });
      showToast("Exported successfully");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Export failed";
      addRecord({
        kind: "export",
        tone: "error",
        title: "Export failed",
        message,
      });
      showToast(`Export failed: ${message}`, "error");
    }
  }, [addRecord]);

  return {
    saveProject,
    loadProject,
    validateProject,
    previewProject,
    exportPython,
    createId,
  };
}
