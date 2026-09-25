"""Load a pipeline transform by path.

tests/pipeline is itself a package named `pipeline`, which shadows the real one,
so a transform's `from pipeline.transforms.common import ...` is satisfied by
registering the real common module under that name first.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path
from types import ModuleType

ROOT = Path(__file__).resolve().parents[2]


def _load(name: str, path: Path) -> ModuleType:
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec and spec.loader
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_transform(stem: str) -> ModuleType:
    common = _load("_transform_common", ROOT / "pipeline" / "transforms" / "common.py")
    sys.modules.setdefault("pipeline.transforms", ModuleType("pipeline.transforms"))
    sys.modules["pipeline.transforms.common"] = common
    return _load(f"_transform_{stem}", ROOT / "pipeline" / "transforms" / f"{stem}.py")
