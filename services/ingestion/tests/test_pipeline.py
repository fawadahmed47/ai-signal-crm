from __future__ import annotations

import pathlib
import sys
import tempfile
import unittest

SERVICE_ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVICE_ROOT))

import main


class RecordingSink:
    def __init__(self, fail: bool = False) -> None:
        self.fail = fail
        self.rows = []

    def write(self, rows):
        if self.fail:
            raise RuntimeError("storage unavailable")
        self.rows.extend(rows)
        return len(rows)


class PipelineTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original_log = main.LOG_FILE
        self.temp_directory = tempfile.TemporaryDirectory()
        main.LOG_FILE = pathlib.Path(self.temp_directory.name) / "processing.log"

    def tearDown(self) -> None:
        main.LOG_FILE = self.original_log
        self.temp_directory.cleanup()

    def test_marks_only_successful_urls_after_every_sink_succeeds(self) -> None:
        marked = []
        rows = [
            {"category": "investment", "link": "https://example.com/good"},
            {"category": "error", "link": "https://example.com/retry"},
        ]
        sinks = [RecordingSink(), RecordingSink()]

        urls = main.persist_and_mark_processed(rows, sinks, marked.extend)

        self.assertEqual(urls, ["https://example.com/good"])
        self.assertEqual(marked, ["https://example.com/good"])
        self.assertEqual(len(sinks[0].rows), 2)
        self.assertEqual(len(sinks[1].rows), 2)

    def test_does_not_mark_urls_when_a_sink_fails(self) -> None:
        marked = []
        rows = [{"category": "investment", "link": "https://example.com/good"}]

        with self.assertRaisesRegex(RuntimeError, "storage unavailable"):
            main.persist_and_mark_processed(
                rows,
                [RecordingSink(), RecordingSink(fail=True)],
                marked.extend,
            )

        self.assertEqual(marked, [])


if __name__ == "__main__":
    unittest.main()
