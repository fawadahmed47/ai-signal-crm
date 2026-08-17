# Ingestion service

This service contains the reusable collector, article fetcher, AI extractor, and normalization pipeline from the original data-center intelligence project.

The original runtime artifacts were intentionally excluded:

- `output.csv`
- `seen.db`
- processing and collector logs
- Python bytecode

During `ASCRM-30`, this pipeline will be adapted to emit a versioned signal contract into PostgreSQL while retaining CSV export as an adapter.

