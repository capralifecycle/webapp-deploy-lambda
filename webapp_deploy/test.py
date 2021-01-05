import os
import shutil
import tempfile
import unittest

from webapp_deploy.main import extract  # noqa: F401


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
