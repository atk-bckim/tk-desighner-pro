import { Toolbar } from "./components/Toolbar";
import { Toolbox } from "./components/Toolbox";
import { Canvas } from "./components/Canvas";
import { PropertyPanel } from "./components/PropertyPanel";

export default function App() {
  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <Toolbar />
      <div className="flex flex-1 overflow-hidden">
        <Toolbox />
        <Canvas />
        <PropertyPanel />
      </div>
    </div>
  );
}
