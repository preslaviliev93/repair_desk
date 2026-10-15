"""Compile the native NSIS installer after electron-builder --win dir.

Usage: python docs/build-installer.py /absolute/path/to/linux/makensis
Uses only the existing release/win-unpacked payload; does not run Windows code.
"""
from pathlib import Path
import os
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parent.parent
payload = root / 'release' / 'win-unpacked'
if not (payload / 'RepairDesk Offline.exe').is_file():
    raise SystemExit('First package with electron-builder --win dir --config.directories.output=release')
files = sorted(path for path in payload.rglob('*') if path.is_file())
directories = sorted((p for p in payload.rglob('*') if p.is_dir()), key=lambda p: len(p.parts), reverse=True)
def nsis_path(path):
    return str(path.relative_to(payload)).replace('\\', '/').replace('$', '$$').replace('"', '$\\"').replace('/', '\\')
with tempfile.TemporaryDirectory(prefix='repairdesk-nsis-') as tmp:
    inventory = Path(tmp) / 'remove-files.nsh'
    inventory.write_text('\n'.join(
        [f'Delete "$INSTDIR\\{nsis_path(p)}"' for p in files] +
        [f'RMDir "$INSTDIR\\{nsis_path(p)}"' for p in directories]
    ) + '\n')
    makensis = Path(sys.argv[1]).resolve()
    environment = dict(os.environ, NSISDIR=str(makensis.parent.parent))
    subprocess.run([str(makensis), f'-DAPP_DIR={payload}',
                    f'-DOUTPUT_FILE={root / "release" / "RepairDesk Offline Setup 1.0.0.exe"}',
                    f'-DREMOVE_FILES={inventory}', str(root / 'docs' / 'windows-installer.nsi')],
                   check=True, env=environment, cwd=root)
