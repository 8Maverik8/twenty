import hashlib
import json
from pathlib import Path
import subprocess
import sys

folder = Path(__file__).resolve().parent
root = folder.parents[2]
scope = json.loads((folder / 'scope.json').read_text())
def git(*args):
    return subprocess.check_output(['git', *args], cwd=root)
source = scope['source']
assert hashlib.sha256(git('show', scope['base'] + ':' + source)).hexdigest() == scope['source_before_sha256']
assert hashlib.sha256((root / source).read_bytes()).hexdigest() == scope['source_after_sha256']
changed = git('diff', '--name-only', scope['base'], 'HEAD').decode().splitlines()
assert changed and source in changed
assert all(path == source or path.startswith(scope['allowed_prefix']) for path in changed), 'Profile covers only this reviewed hotfix'
assert not any(path.endswith(('package.json', 'yarn.lock', 'pnpm-lock.yaml')) for path in changed)
result = {'status': 'passed', 'scope': scope['scope'], 'new_package_dependencies': 0, 'baseline_dependency_audit': 'outside unchanged hotfix scope', 'changed_files': changed}
report = Path(sys.argv[1]); report.parent.mkdir(parents=True, exist_ok=True)
report.write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps(result))
