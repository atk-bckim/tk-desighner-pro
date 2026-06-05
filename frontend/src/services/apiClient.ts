import type { Project } from "../types/widgets";
import { projectToApiPayload } from "../utils/projectPayload";

export type DiagnosticSeverity = "error" | "warning" | "info";

export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  path?: string | null;
  widget_id?: string | null;
  widget_name?: string | null;
}

export interface CodegenResponse {
  code: string;
  valid: boolean;
  diagnostics: Diagnostic[];
  generator_version: string;
  project_schema_version: number;
}

export interface ValidateResponse {
  valid: boolean;
  diagnostics: Diagnostic[];
  errors: string[];
}

export interface PreviewResponse {
  status: string;
  code: string;
  warning?: string | null;
}

export class ApiError extends Error {
  status: number;
  diagnostics: Diagnostic[];
  errors: string[];
  body: unknown;

  constructor({
    status,
    message,
    diagnostics = [],
    errors = [],
    body = null,
  }: {
    status: number;
    message: string;
    diagnostics?: Diagnostic[];
    errors?: string[];
    body?: unknown;
  }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.diagnostics = diagnostics;
    this.errors = errors;
    this.body = body;
  }
}

export function diagnosticsToMessages(diagnostics: Diagnostic[], fallbackErrors: string[] = []): string[] {
  if (diagnostics.length > 0) {
    return diagnostics.map((diagnostic) => {
      const prefix = [diagnostic.severity.toUpperCase(), diagnostic.code].filter(Boolean).join(" ");
      const target = [
        diagnostic.widget_name ? `widget ${diagnostic.widget_name}` : null,
        !diagnostic.widget_name && diagnostic.widget_id ? `widget ${diagnostic.widget_id}` : null,
        diagnostic.path ?? null,
      ].filter(Boolean).join(", ");
      return target ? `${prefix}: ${diagnostic.message} (${target})` : `${prefix}: ${diagnostic.message}`;
    });
  }
  return fallbackErrors.filter((error) => error.trim().length > 0);
}

async function postProjectJson<T>(url: string, project: Project, tkTheme: string): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(projectToApiPayload(project, tkTheme)),
  });
  if (!response.ok) {
    throw await buildApiError(response);
  }
  return parseJsonResponse<T>(response);
}

export function generateCode(project: Project, tkTheme: string): Promise<CodegenResponse> {
  return postProjectJson<CodegenResponse>("/api/codegen", project, tkTheme);
}

export function validateProject(project: Project, tkTheme: string): Promise<ValidateResponse> {
  return postProjectJson<ValidateResponse>("/api/validate", project, tkTheme);
}

export function previewProject(project: Project, tkTheme: string): Promise<PreviewResponse> {
  return postProjectJson<PreviewResponse>("/api/preview", project, tkTheme);
}

export async function exportPython(project: Project, tkTheme: string): Promise<Blob> {
  const response = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(projectToApiPayload(project, tkTheme)),
  });
  if (!response.ok) {
    throw await buildApiError(response);
  }
  return response.blob();
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  return data as T;
}

async function buildApiError(response: Response): Promise<ApiError> {
  const body = await parseErrorBody(response);
  const diagnostics = getDiagnostics(body);
  const errors = getErrors(body);
  const messages = diagnosticsToMessages(diagnostics, errors);
  const detail = getDetailMessage(body);
  const message = messages[0] ?? detail ?? `HTTP ${response.status}`;

  return new ApiError({
    status: response.status,
    message,
    diagnostics,
    errors,
    body,
  });
}

async function parseErrorBody(response: Response): Promise<unknown> {
  const text = await response.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function getDiagnostics(body: unknown): Diagnostic[] {
  if (!isRecord(body) || !Array.isArray(body.diagnostics)) return [];
  return body.diagnostics.filter(isDiagnostic);
}

function getErrors(body: unknown): string[] {
  if (!isRecord(body) || !Array.isArray(body.errors)) return [];
  return body.errors.filter((error): error is string => typeof error === "string");
}

function getDetailMessage(body: unknown): string | null {
  if (typeof body === "string") return body;
  if (!isRecord(body)) return null;
  const { detail } = body;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (isRecord(item) && typeof item.msg === "string") return item.msg;
        if (typeof item === "string") return item;
        return null;
      })
      .filter((item): item is string => item !== null);
    if (messages.length > 0) return messages.join("; ");
  }
  return null;
}

function isDiagnostic(value: unknown): value is Diagnostic {
  if (!isRecord(value)) return false;
  return (
    (value.severity === "error" || value.severity === "warning" || value.severity === "info") &&
    typeof value.code === "string" &&
    typeof value.message === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
