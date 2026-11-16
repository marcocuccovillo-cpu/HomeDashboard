"""Sostituto minimo di orjson per HomeDashboard.

aiovodafone usa orjson solo per leggere e scrivere JSON (loads, dumps, JSONDecodeError).
Il vero orjson va compilato con Rust e non si installa su Android a 32 bit (armv8l):
questo file, messo accanto a dispositivi.py, fa la stessa cosa con il modulo json di Python.
"""

import json as _json

JSONDecodeError = _json.JSONDecodeError


def loads(dati):
    if isinstance(dati, (bytes, bytearray, memoryview)):
        dati = bytes(dati).decode("utf-8")
    return _json.loads(dati)


def dumps(oggetto, default=None, option=None):
    # come orjson: compatto, UTF-8, restituisce bytes
    return _json.dumps(oggetto, default=default, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
