import { useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  diagnosticsToMessages,
  generateCode as generateCodeFromApi,
  validateProject as validateProjectFromApi,
} from "../services/apiClient";
import { useDesignerStore } from "../store/designerStore";
import type { Project } from "../types/widgets";
import { StatusChip, TextButton } from "./ui";

type CodeStatus = "idle" | "loading" | "ready" | "error";
type ValidationStatus = "idle" | "checking" | "success" | "warning" | "error";

interface CodeState {
  code: string;
  status: CodeStatus;
  stale: boolean;
  valid: boolean | null;
  messages: string[];
  error: string | null;
}

interface ValidationState {
  status: ValidationStatus;
  messages: string[];
  projectKey: string | null;
}

const DEBOUNCE_MS = 300;
const IDLE_VALIDATION_STATE: ValidationState = {
  status: "idle",
  messages: [],
  projectKey: null,
};

function messagesFromError(error: unknown, fallback: string): string[] {
  if (error instanceof ApiError) {
    return diagnosticsToMessages(error.diagnostics, error.errors).concat(
      error.message ? [error.message] : [],
    ).filter((message, index, messages) => message && messages.indexOf(message) === index);
  }
  if (error instanceof Error) return [error.message];
  return [fallback];
}

function statusTone(state: CodeState): "neutral" | "accent" | "success" | "warning" | "danger" {
  if (state.status === "error") return "danger";
  if (state.stale || state.status === "loading") return "warning";
  if (state.valid === false) return "danger";
  if (state.messages.length > 0) return "warning";
  if (state.status === "ready") return "success";
  return "neutral";
}

function statusLabel(state: CodeState) {
  if (state.status === "error") return state.code ? "stale error" : "error";
  if (state.stale) return "stale";
  if (state.status === "loading") return "loading";
  if (state.valid === false) return "invalid";
  if (state.messages.length > 0) return "issues";
  if (state.status === "ready") return "ready";
  return "idle";
}

function validationTone(state: ValidationState): "neutral" | "success" | "warning" | "danger" {
  if (state.status === "error") return "danger";
  if (state.status === "warning") return "warning";
  if (state.status === "success") return "success";
  return "neutral";
}

function buildPreviewText(state: CodeState) {
  if (state.code) return state.code;
  if (state.status === "error") return state.error ?? "Code generation failed.";
  return "Generating Python from backend...";
}

function getProjectKey(project: Project, tkTheme: string) {
  return JSON.stringify({ project, tkTheme });
}

function getCurrentProjectKey() {
  const store = useDesignerStore.getState();
  return getProjectKey(store.exportProject(), store.tkTheme);
}

export function CodePreview({ docked = false }: { docked?: boolean }) {
  const projectName = useDesignerStore((state) => state.projectName);
  const canvasWidth = useDesignerStore((state) => state.canvasWidth);
  const canvasHeight = useDesignerStore((state) => state.canvasHeight);
  const widgets = useDesignerStore((state) => state.widgets);
  const menuBar = useDesignerStore((state) => state.menuBar);
  const rootBg = useDesignerStore((state) => state.rootBg);
  const rootResizable = useDesignerStore((state) => state.rootResizable);
  const variables = useDesignerStore((state) => state.variables);
  const nonVisuals = useDesignerStore((state) => state.nonVisuals);
  const resources = useDesignerStore((state) => state.resources);
  const tkTheme = useDesignerStore((state) => state.tkTheme);

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [codeState, setCodeState] = useState<CodeState>({
    code: "",
    status: "loading",
    stale: false,
    valid: null,
    messages: [],
    error: null,
  });
  const [validationState, setValidationState] = useState<ValidationState>(IDLE_VALIDATION_STATE);
  const requestIdRef = useRef(0);
  const validationRequestIdRef = useRef(0);

  const project = useMemo<Project>(() => ({
    name: projectName,
    canvasWidth,
    canvasHeight,
    widgets,
    menuBar,
    rootBg,
    rootResizable,
    variables,
    nonVisuals,
    resources,
  }), [
    projectName,
    canvasWidth,
    canvasHeight,
    widgets,
    menuBar,
    rootBg,
    rootResizable,
    variables,
    nonVisuals,
    resources,
  ]);
  const projectKey = useMemo(() => getProjectKey(project, tkTheme), [project, tkTheme]);
  const currentValidationState = validationState.projectKey === projectKey
    ? validationState
    : IDLE_VALIDATION_STATE;

  useEffect(() => {
    const requestId = ++requestIdRef.current;
    let active = true;

    const timeoutId = window.setTimeout(() => {
      setCodeState((current) => ({
        ...current,
        status: "loading",
        stale: Boolean(current.code),
        error: null,
      }));

      generateCodeFromApi(project, tkTheme)
        .then((response) => {
          if (!active || requestIdRef.current !== requestId) return;
          setCodeState({
            code: response.code,
            status: "ready",
            stale: false,
            valid: response.valid,
            messages: diagnosticsToMessages(response.diagnostics),
            error: response.valid ? null : "Generated code has diagnostics.",
          });
        })
        .catch((error: unknown) => {
          if (!active || requestIdRef.current !== requestId) return;
          const messages = messagesFromError(error, "Code generation failed");
          setCodeState((current) => ({
            ...current,
            status: "error",
            stale: Boolean(current.code),
            messages,
            error: messages[0] ?? "Code generation failed",
          }));
        });
    }, DEBOUNCE_MS);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [project, tkTheme]);

  useEffect(() => {
    return () => {
      validationRequestIdRef.current += 1;
    };
  }, []);

  const handleValidate = async () => {
    const requestId = ++validationRequestIdRef.current;
    const requestProjectKey = projectKey;
    setValidationState({ status: "checking", messages: [], projectKey: requestProjectKey });
    try {
      const response = await validateProjectFromApi(project, tkTheme);
      if (validationRequestIdRef.current !== requestId || getCurrentProjectKey() !== requestProjectKey) return;
      const messages = diagnosticsToMessages(response.diagnostics, response.errors);
      setValidationState({
        status: response.valid ? "success" : "warning",
        messages,
        projectKey: requestProjectKey,
      });
    } catch (error) {
      if (validationRequestIdRef.current !== requestId || getCurrentProjectKey() !== requestProjectKey) return;
      setValidationState({
        status: "error",
        messages: messagesFromError(error, "Validation request failed"),
        projectKey: requestProjectKey,
      });
    }
  };

  const handleCopy = async () => {
    if (!codeState.code) return;
    await navigator.clipboard.writeText(codeState.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const validationLabel = currentValidationState.status === "checking"
    ? "Checking"
    : currentValidationState.messages.length > 0
      ? `${currentValidationState.messages.length} issues`
      : "Check";

  const statusSummary = (
    <div className="flex min-w-0 items-center gap-2">
      <span className="truncate text-[11px] font-semibold text-[var(--td-text)]">Generated Python</span>
      <StatusChip tone={widgets.length > 0 ? "accent" : "neutral"}>{widgets.length} widgets</StatusChip>
      <StatusChip tone={statusTone(codeState)}>{statusLabel(codeState)}</StatusChip>
      {currentValidationState.status !== "idle" && (
        <StatusChip tone={validationTone(currentValidationState)}>
          {currentValidationState.status === "checking" ? "checking" : currentValidationState.status}
        </StatusChip>
      )}
    </div>
  );

  const diagnostics = [
    ...codeState.messages.map((message) => ({ source: "Codegen", message })),
    ...currentValidationState.messages.map((message) => ({ source: "Validation", message })),
  ];

  if (docked) {
    return (
      <div className="flex h-full min-h-0 flex-col bg-[var(--td-panel)]">
        <div className="flex h-8 shrink-0 items-center justify-between border-b border-[var(--td-border)] px-3">
          {statusSummary}
          <div className="ml-2 flex shrink-0 items-center gap-1">
            <TextButton onClick={handleValidate} disabled={currentValidationState.status === "checking"}>
              {validationLabel}
            </TextButton>
            <TextButton onClick={handleCopy} disabled={!codeState.code}>
              {copied ? "Copied" : "Copy"}
            </TextButton>
          </div>
        </div>
        {codeState.error && (
          <div className="border-b border-[var(--td-border)] px-3 py-1 text-[11px] text-red-300">
            {codeState.error}
          </div>
        )}
        <pre className={`min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[11px] leading-5 ${codeState.status === "error" && !codeState.code ? "text-red-300" : "text-emerald-300"}`}>
          {buildPreviewText(codeState)}
        </pre>
        {diagnostics.length > 0 && (
          <div className="max-h-20 overflow-auto border-t border-[var(--td-border)] px-3 py-2">
            {diagnostics.map((diagnostic, index) => (
              <div key={`${diagnostic.source}-${index}`} className="text-[10px] leading-5 text-amber-200">
                {diagnostic.source}: {diagnostic.message}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-[#252536] border-t border-[#3c3c52] shrink-0">
      <div className="flex items-center justify-between px-4 py-1.5">
        <button
          className="text-xs text-[#8888a8] hover:text-[#d4d4e8] flex items-center gap-2 transition-colors"
          onClick={() => setOpen(!open)}
          type="button"
        >
          <span>Generated Code ({widgets.length} widgets)</span>
          <StatusChip tone={statusTone(codeState)}>{statusLabel(codeState)}</StatusChip>
          <span className="text-[10px]">{open ? "▾" : "▸"}</span>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={handleValidate}
            disabled={currentValidationState.status === "checking"}
            className="text-[10px] bg-[#1e1e2e] border border-[#3c3c52] hover:border-[#06b6d4]/50 text-[#8888a8] hover:text-[#d4d4e8] px-2 py-0.5 rounded transition-colors disabled:opacity-35"
            type="button"
          >
            {validationLabel}
          </button>
          <button
            onClick={handleCopy}
            disabled={!codeState.code}
            className="text-[10px] bg-[#1e1e2e] border border-[#3c3c52] hover:border-[#06b6d4]/50 text-[#8888a8] hover:text-[#d4d4e8] px-2 py-0.5 rounded transition-colors disabled:opacity-35"
            type="button"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>
      {open && (
        <>
          {codeState.error && (
            <div className="px-4 pb-2 text-[10px] text-[#f87171]">
              {codeState.error}
            </div>
          )}
          <pre className={`px-4 pb-3 text-[11px] overflow-auto max-h-48 font-mono ${codeState.status === "error" && !codeState.code ? "text-[#f87171]" : "text-[#10b981]"}`}>
            {buildPreviewText(codeState)}
          </pre>
          {diagnostics.length > 0 && (
            <div className="px-4 pb-2">
              {diagnostics.map((diagnostic, index) => (
                <div key={`${diagnostic.source}-${index}`} className="text-[10px] text-[#f59e0b] flex items-center gap-1 mb-0.5">
                  <span>&#9888;</span> {diagnostic.source}: {diagnostic.message}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
