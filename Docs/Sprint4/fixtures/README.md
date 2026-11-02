# Sprint 4 demo fixtures

Illustrative raw-feature rows for the Friction-Gate demo. **Not** a test set and **not** used to tune the ops threshold.

| File | Expect | Approx. score |
|------|--------|---------------|
| [below_threshold_demo.json](below_threshold_demo.json) | Not flagged | ~0.21 |
| [flagged_demo.json](flagged_demo.json) | Flagged @ `t≈0.701` | ~0.75 |

Pinned ops run: `3f575754ae9a42c5a21ea5e476c0af37`.  
Streamlit loads these via preset selector in `Code/Sprint3/friction_gate_app.py`.  
Re-verify after any `Models/ops/` re-export:

```cmd
set PYTHONPATH=%CD%
py -3.13 -c "import json; from pathlib import Path; from src.serving.model import get_ops_model, score_raw_features; m=get_ops_model();\
[print(p.name, score_raw_features(m, json.loads(p.read_text())['features'])) for p in Path('Docs/Sprint4/fixtures').glob('*_demo.json')]"
```
