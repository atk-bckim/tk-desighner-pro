import subprocess
import sys
import os

def main():
    root = os.path.dirname(os.path.abspath(__file__))
    frontend = os.path.join(root, "frontend")
    backend = os.path.join(root, "backend")

    procs = []
    try:
        print("Starting backend...")
        procs.append(subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "app.main:app", "--reload", "--port", "8000"],
            cwd=backend,
        ))

        print("Starting frontend...")
        procs.append(subprocess.Popen(
            ["npm", "run", "dev"],
            cwd=frontend,
        ))

        print("Tkinter Designer running. Press Ctrl+C to stop.")
        for p in procs:
            p.wait()
    except KeyboardInterrupt:
        print("\nShutting down...")
        for p in procs:
            p.terminate()

if __name__ == "__main__":
    main()
