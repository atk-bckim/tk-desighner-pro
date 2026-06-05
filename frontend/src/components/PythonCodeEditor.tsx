import { useEffect, useRef } from "react";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { python } from "@codemirror/lang-python";
import { bracketMatching, defaultHighlightStyle, foldGutter, foldKeymap, indentOnInput, syntaxHighlighting } from "@codemirror/language";
import { EditorState } from "@codemirror/state";
import { oneDark } from "@codemirror/theme-one-dark";
import {
  crosshairCursor,
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  rectangularSelection,
} from "@codemirror/view";

interface PythonCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onEscape?: () => void;
  onModEnter?: () => void;
  theme?: "dark" | "light";
}

export default function PythonCodeEditor({
  value,
  onChange,
  onEscape,
  onModEnter,
  theme = "dark",
}: PythonCodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const initialValueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const onEscapeRef = useRef(onEscape);
  const onModEnterRef = useRef(onModEnter);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    onModEnterRef.current = onModEnter;
  }, [onModEnter]);

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: initialValueRef.current,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        keymap.of([
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          indentWithTab,
          {
            key: "Mod-Enter",
            run: () => {
              onModEnterRef.current?.();
              return true;
            },
          },
        ]),
        python(),
        ...(theme === "dark" ? [oneDark] : []),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current(update.state.doc.toString());
          }
        }),
        EditorView.domEventHandlers({
          keydown(event) {
            event.stopPropagation();
            if (event.key === "Escape") {
              onEscapeRef.current?.();
            }
            return false;
          },
        }),
        EditorView.theme({
          "&": { fontSize: "12px", height: "100%", width: "100%" },
          ".cm-scroller": { overflow: "auto" },
          ".cm-content": { padding: "4px 0" },
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    editorViewRef.current = view;

    return () => {
      view.destroy();
      editorViewRef.current = null;
    };
  }, [theme]);

  useEffect(() => {
    const view = editorViewRef.current;
    if (!view) return;

    const currentValue = view.state.doc.toString();
    if (currentValue === value) return;

    view.dispatch({
      changes: { from: 0, to: currentValue.length, insert: value },
    });
  }, [value]);

  return <div ref={containerRef} className="flex-1 overflow-hidden" />;
}
