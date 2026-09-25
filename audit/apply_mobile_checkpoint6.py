"""Restore the exact, checksum-verified checkpoint #6 source patch.

Only an isolated source checkout is changed. No API, data or deployments.
"""
from pathlib import Path
import gzip
import hashlib
import subprocess

expected = {
    'src/components/StandingsTable.jsx': 'bc689caf08811b1efa31bdb53a1ef9ff1359cf1d',
    'src/components/scores/MatchCentre.jsx': 'e0ccb50a9347f4483ad7787be1f1c2e282788573',
}
for name, sha in expected.items():
    raw = Path(name).read_bytes()
    actual = hashlib.sha1(f'blob {len(raw)}\0'.encode() + raw).hexdigest()
    if actual != sha:
        raise SystemExit(f'Refusing changed baseline {name}: {actual}')
patch = gzip.decompress(Path('audit/mobile-responsive-checkpoint6.patch.gz').read_bytes())
assert hashlib.sha256(patch).hexdigest() == '80865fce8c15ccfd255face6a7975a12fb4d3c8fe097830f45a67217a49d5f1e'
subprocess.run(['git', 'apply', '--check', '-'], input=patch, check=True)
subprocess.run(['git', 'apply', '-'], input=patch, check=True)
print('Restored all six checkpoint #6 mobile source/test files without changing score data.')
