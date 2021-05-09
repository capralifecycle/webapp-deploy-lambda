import os
import shutil
import tempfile
import unittest
from pathlib import Path

from webapp_deploy.main import construct_all_files, extract  # noqa: F401


class ExtractTest(unittest.TestCase):
    def test_extract_zip(self):
        temp_dir = tempfile.mkdtemp()

        extract("s3://example/source.zip", "example-assets/source.zip", temp_dir, None)

        self.assertListEqual(
            sorted(os.listdir(temp_dir)), ["README.md", "index.js", "index.js.map"]
        )

        shutil.rmtree(temp_dir)

    def test_extract_tgz(self):
        temp_dir = tempfile.mkdtemp()

        extract("s3://example/source.tgz", "example-assets/source.tgz", temp_dir, None)

        self.assertListEqual(
            sorted(os.listdir(temp_dir)), ["README.md", "index.js", "index.js.map"]
        )

        shutil.rmtree(temp_dir)

    def test_extract_tgz_filter_pattern(self):
        temp_dir = tempfile.mkdtemp()

        extract(
            "s3://example/source.tgz", "example-assets/source.tgz", temp_dir, "\\.map$"
        )

        self.assertListEqual(sorted(os.listdir(temp_dir)), ["README.md", "index.js"])

        shutil.rmtree(temp_dir)


class Files(unittest.TestCase):
    def test_construct_all_files(self):
        temp_dir = tempfile.mkdtemp()

        (Path(temp_dir) / "a.txt").write_text("hello")
        Path.mkdir(Path(temp_dir) / "b")
        (Path(temp_dir) / "b/c.txt").write_text("world")

        self.assertListEqual(
            construct_all_files(temp_dir, "web/"),
            [
                ["a.txt", str(Path(temp_dir) / "a.txt"), "web/a.txt"],
                ["b/c.txt", str(Path(temp_dir) / "b/c.txt"), "web/b/c.txt"],
            ],
        )

        shutil.rmtree(temp_dir)
