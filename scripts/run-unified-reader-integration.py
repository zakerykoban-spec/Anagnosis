from pathlib import Path

script_path = Path('scripts/apply-unified-reader-navigation.py')
source = script_path.read_text(encoding='utf-8')
bad = '    "      setFreeReadingBoundaryError(null)\\n\\n"'
good = '    "    setFreeReadingBoundaryError(null)\\n\\n"'
if bad not in source:
    raise RuntimeError('The expected indentation defect was not found in the integration script.')
source = source.replace(bad, good, 1)
namespace = {
    '__name__': '__main__',
    '__file__': str(script_path),
}
exec(compile(source, str(script_path), 'exec'), namespace)
