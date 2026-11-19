import io
from pathlib import Path
import tarfile
import tempfile
import unittest

from compare_npm_archives import compare_archives


class ArchiveComparisonTest(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.directory = Path(temporary.name)
        self.local = self.write_archive('local', [('README.md', b'okunur', 0o600)])

    def write_archive(self, name, files):
        path = self.directory / f'{name}.tgz'
        with tarfile.open(path, 'w:gz') as archive:
            for file_name, contents, mode in files:
                entry = tarfile.TarInfo(f'package/{file_name}')
                entry.size = len(contents)
                entry.mode = mode
                archive.addfile(entry, io.BytesIO(contents))
        return path

    def test_accepts_read_and_write_permission_differences(self):
        published = self.write_archive('published', [('README.md', b'okunur', 0o644)])
        self.assertNotEqual(self.local.read_bytes(), published.read_bytes())
        self.assertEqual(compare_archives(self.local, published), 1)

    def test_rejects_changed_content(self):
        published = self.write_archive('published', [('README.md', b'different', 0o644)])
        with self.assertRaisesRegex(ValueError, 'Dosya içeriği'):
            compare_archives(self.local, published)

    def test_rejects_changed_file_list(self):
        published = self.write_archive('published', [('OTHER.md', b'okunur', 0o644)])
        with self.assertRaisesRegex(ValueError, 'dosya listeleri'):
            compare_archives(self.local, published)

    def test_rejects_changed_execute_permissions(self):
        published = self.write_archive('published', [('README.md', b'okunur', 0o755)])
        with self.assertRaisesRegex(ValueError, 'çalıştırma izni'):
            compare_archives(self.local, published)

    def test_rejects_duplicate_paths(self):
        duplicate = ('README.md', b'okunur', 0o644)
        published = self.write_archive('published', [duplicate, duplicate])
        with self.assertRaisesRegex(ValueError, 'tekrarlanan yol'):
            compare_archives(self.local, published)
