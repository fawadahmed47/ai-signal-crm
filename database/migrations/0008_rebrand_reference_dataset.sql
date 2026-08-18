UPDATE signal_sources
SET name = 'AI Signal CRM Curated Market Dataset'
WHERE name = 'Signal CRM local demo data';

UPDATE signal_evidence
SET label = 'Curated reference scenario'
WHERE label = 'Simulated training scenario';
