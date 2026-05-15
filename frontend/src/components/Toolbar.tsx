import { useDesignerStore } from "../store/designerStore";

export function Toolbar() {
  const { exportProject, loadProject, projectName, setProjectName, undo, redo, snapshot, removeWidget, duplicateWidget, selectedId, snapEnabled, toggleSnap } =
    useDesignerStore();
  const undoStackLen = useDesignerStore((s) => s.undoStack.length);
  const redoStackLen = useDesignerStore((s) => s.redoStack.length);

  const handleSave = () => {
    const project = exportProject();
    const json = JSON.stringify(project, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}.tkdesigner.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoad = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.tkdesigner.json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const project = JSON.parse(ev.target?.result as string);
          loadProject(project);
        } catch {
          alert("Invalid project file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handlePreview = async () => {
    try {
      const project = exportProject();
      const res = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name,
          canvas_width: project.canvasWidth,
          canvas_height: project.canvasHeight,
          widgets: project.widgets.map(w => ({
            id: w.id,
            type: w.type,
            parent_id: w.parentId,
            x: w.x,
            y: w.y,
            width: w.width,
            height: w.height,
            props: w.props,
          })),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      alert("Preview failed: " + (err as Error).message);
    }
  };

  const handleExport = async () => {
    try {
      const project = exportProject();
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name,
          canvas_width: project.canvasWidth,
          canvas_height: project.canvasHeight,
          widgets: project.widgets.map(w => ({
            id: w.id,
            type: w.type,
            parent_id: w.parentId,
            x: w.x,
            y: w.y,
            width: w.width,
            height: w.height,
            props: w.props,
          })),
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name.replace(/ /g, "_")}.py`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed: " + (err as Error).message);
    }
  };

  return (
    <div className="h-12 bg-gray-800 text-white flex items-center px-4 gap-4 shrink-0">
      <h1 className="font-bold text-lg">Tkinter Designer</h1>
      <div className="h-6 w-px bg-gray-600" />
      <input
        className="bg-gray-700 px-2 py-1 rounded text-sm w-40"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
      />
      <button
        onClick={handleSave}
        className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
      >
        Save
      </button>
      <button
        onClick={handleLoad}
        className="bg-gray-600 hover:bg-gray-700 px-3 py-1 rounded text-sm"
      >
        Load
      </button>
      <div className="h-6 w-px bg-gray-600" />
      <button onClick={() => undo()} disabled={undoStackLen === 0} className="bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded text-sm disabled:opacity-30" title="Undo (Ctrl+Z)">&#8630;</button>
      <button onClick={() => redo()} disabled={redoStackLen === 0} className="bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded text-sm disabled:opacity-30" title="Redo (Ctrl+Y)">&#8631;</button>
      <div className="h-6 w-px bg-gray-600" />
      <button onClick={() => { if (selectedId) { snapshot(); removeWidget(selectedId); } }} disabled={!selectedId} className="bg-red-700 hover:bg-red-600 px-2 py-1 rounded text-sm disabled:opacity-30" title="Delete">&#10005;</button>
      <button onClick={() => { if (selectedId) { snapshot(); duplicateWidget(selectedId); } }} disabled={!selectedId} className="bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded text-sm disabled:opacity-30" title="Duplicate (Ctrl+D)">&#10723;</button>
      <div className="h-6 w-px bg-gray-600" />
      <button onClick={toggleSnap} className={`px-2 py-1 rounded text-sm ${snapEnabled ? "bg-blue-600 hover:bg-blue-500" : "bg-gray-600 hover:bg-gray-500"}`} title="Toggle Grid">&#8845;</button>
      <button
        onClick={handlePreview}
        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
      >
        Preview
      </button>
      <button
        onClick={handleExport}
        className="bg-amber-600 hover:bg-amber-700 px-3 py-1 rounded text-sm"
      >
        Export .py
      </button>
    </div>
  );
}
