#!/usr/bin/env python3
"""Inline src/*.js and src/style.css into one self-contained dist/index.html."""
import pathlib

root = pathlib.Path(__file__).parent
src = root / "src"
tpl = (src / "index.template.html").read_text()
app = "\n".join((src / f).read_text() for f in ("state.js", "views.js", "main.js"))
out = (
    tpl.replace("/*__CSS__*/", (src / "style.css").read_text())
    .replace("/*__ENGINE__*/", (src / "engine.js").read_text())
    .replace("/*__KIT__*/", (src / "kit.js").read_text())
    .replace("/*__APP__*/", app)
)
(root / "dist").mkdir(exist_ok=True)
(root / "dist" / "index.html").write_text(out)
print("built dist/index.html", len(out) // 1024, "KB")
