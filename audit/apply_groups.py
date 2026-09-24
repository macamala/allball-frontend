"""Apply a checksum-bound patch in an isolated verification checkout."""
import base64, hashlib, subprocess, zlib
from pathlib import Path
paths = sorted(Path('audit/groups').glob('*.b64'))
assert len(paths) == 3
raw = zlib.decompress(base64.b64decode(''.join(p.read_text().strip() for p in paths), validate=True))
assert hashlib.sha256(raw).hexdigest() == '857bdb6e62d83f14a0229f6988360bf4c2c49eea2d3fbedccc8ba0d9ff56ad44'
p = Path('/tmp/football-groups.patch')
p.write_bytes(raw)
subprocess.run(['git','apply','--check',str(p)], check=True)
subprocess.run(['git','apply',str(p)], check=True)
subprocess.run(['git','apply','--check','audit/visible-tab-assertions.patch'], check=True)
subprocess.run(['git','apply','audit/visible-tab-assertions.patch'], check=True)
