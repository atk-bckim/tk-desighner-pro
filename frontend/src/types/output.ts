export type OutputKind = "validation" | "preview" | "export" | "log";
export type OutputTone = "info" | "success" | "warning" | "error";

export interface OutputRecord {
  id: string;
  kind: OutputKind;
  tone: OutputTone;
  title: string;
  message: string;
  createdAt: number;
  details?: string[];
}
