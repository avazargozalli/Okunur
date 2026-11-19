"""Compare npm package files while ignoring read/write bits and archive metadata."""

import hashlib
import sys
import tarfile


def package_files(path):
    files = {}
    seen_paths = set()
    with tarfile.open(path, 'r:gz') as archive:
        for entry in archive:
            if entry.name in seen_paths:
                raise ValueError(f'Arşivde tekrarlanan yol: {entry.name!r}')
            seen_paths.add(entry.name)
            if entry.isdir():
                continue
            if not entry.isfile():
                raise ValueError(f'Desteklenmeyen arşiv girdisi: {entry.name!r}')

            digest = hashlib.sha256()
            with archive.extractfile(entry) as content:
                for chunk in iter(lambda: content.read(64 * 1024), b''):
                    digest.update(chunk)
            files[entry.name] = (digest.digest(), entry.mode & ~0o666)

    if not files:
        raise ValueError('npm arşivinde karşılaştırılacak dosya bulunamadı.')
    return files


def compare_archives(local_path, published_path):
    local_files = package_files(local_path)
    published_files = package_files(published_path)
    different_paths = local_files.keys() ^ published_files.keys()
    if different_paths:
        names = ', '.join(map(repr, sorted(different_paths)))
        raise ValueError(f'npm arşivlerinin dosya listeleri uyuşmuyor: {names}')

    different_files = [
        name for name in sorted(local_files) if local_files[name] != published_files[name]
    ]
    if different_files:
        names = ', '.join(map(repr, different_files))
        raise ValueError(f'Dosya içeriği veya çalıştırma izni uyuşmuyor: {names}')
    return len(local_files)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('Kullanım: compare_npm_archives.py yerel.tgz yayımlanmış.tgz')
    try:
        count = compare_archives(sys.argv[1], sys.argv[2])
    except (OSError, ValueError, tarfile.TarError) as error:
        sys.exit(str(error))
    print(f'{count} npm paket dosyasının içeriği ve çalıştırma izinleri eşleşti.')
