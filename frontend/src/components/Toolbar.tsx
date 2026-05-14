import { useDesignerStore } from "../store/designerStore";

export function Toolbar() {
  const { exportProject, loadProject, projectName, setProjectName } =
    useDesignerStore();

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
    </div>
  );
}
