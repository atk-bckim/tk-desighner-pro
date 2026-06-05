import { useCallback } from "react";
import { showToast } from "../components/toastBus";
import {
  ApiError,
  diagnosticsToMessages,
  exportPython as exportPythonFromApi,
  previewProject as previewProjectFromApi,
  validateProject as validateProjectFromApi,
} from "../services/apiClient";
import { writeAutosave } from "./useAutosave";
import { useDesignerStore } from "../store/designerStore";
import type { OutputRecord } from "../types/output";
import { parseProjectJson, serializeProject } from "../utils/projectSerialization";

type AddOutput = (record: Omit<OutputRecord, "id" | "createdAt">) => void;

function createId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function messagesFromError(error: unknown, fallback: string): string[] {
  if (error instanceof ApiError) {
    return diagnosticsToMessages(error.diagnostics, error.errors).concat(
      error.message ? [error.message] : [],
    ).filter((message, index, messages) => message && messages.indexOf(message) === index);
  }
  if (error instanceof Error) return [error.message];
  return [fallback];
}

export function useProjectCommands(addOutput: AddOutput) {
  const addRecord = useCallback((record: Omit<OutputRecord, "id" | "createdAt">) => {
    addOutput(record);
  }, [addOutput]);

  const saveProject = useCallback(() => {
    const project = useDesignerStore.getState().exportProject();
    const json = serializeProject(project);
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
          const project = parseProjectJson(String(readerEvent.target?.result ?? ""));
          useDesignerStore.getState().loadProject(project);
          writeAutosave(project);
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
      const data = await validateProjectFromApi(project, store.tkTheme);
      const messages = diagnosticsToMessages(data.diagnostics, data.errors);
      const hasIssues = messages.length > 0;
      addRecord({
        kind: "validation",
        tone: hasIssues ? "warning" : "success",
        title: hasIssues ? `${messages.length} validation issues` : "Validation passed",
        message: hasIssues ? "Review generated-code issues before export." : "No validation errors were reported.",
        details: messages,
      });
      showToast(hasIssues ? `${messages.length} validation issues` : "Validation passed", hasIssues ? "warning" : "success");
    } catch (error) {
      const messages = messagesFromError(error, "Validation request failed");
      const message = messages[0] ?? "Validation request failed";
      addRecord({
        kind: "validation",
        tone: "error",
        title: "Validation failed",
        message,
        details: messages,
      });
      showToast(`Validation failed: ${message}`, "error");
    }
  }, [addRecord]);

  const previewProject = useCallback(async () => {
    const store = useDesignerStore.getState();
    const project = store.exportProject();
    try {
      const data = await previewProjectFromApi(project, store.tkTheme);
      const message = data.warning ?? "Tkinter preview launched.";
      addRecord({
        kind: "preview",
        tone: data.warning ? "warning" : "success",
        title: data.warning ? "Preview code only" : "Preview launched",
        message,
      });
      showToast(data.warning ? data.warning : "Preview launched", data.warning ? "warning" : "success");
    } catch (error) {
      const messages = messagesFromError(error, "Preview failed");
      const message = messages[0] ?? "Preview failed";
      addRecord({
        kind: "preview",
        tone: "error",
        title: "Preview failed",
        message,
        details: messages,
      });
      showToast(`Preview failed: ${message}`, "error");
    }
  }, [addRecord]);

  const exportPython = useCallback(async () => {
    const store = useDesignerStore.getState();
    const project = store.exportProject();
    try {
      const blob = await exportPythonFromApi(project, store.tkTheme);
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
      const messages = messagesFromError(error, "Export failed");
      const message = messages[0] ?? "Export failed";
      addRecord({
        kind: "export",
        tone: "error",
        title: "Export failed",
        message,
        details: messages,
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
