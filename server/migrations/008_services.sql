-- Stage 5 service list (concept brief §5.15): "Surveying" becomes "Crop surveying",
-- "Monitoring" becomes "Crop monitoring", and four services are added. Spraying stays held.

ALTER TABLE jobs DROP CONSTRAINT jobs_service_check;

UPDATE jobs SET service = 'Crop surveying' WHERE service = 'Surveying';
UPDATE jobs SET service = 'Crop monitoring' WHERE service = 'Monitoring';

ALTER TABLE jobs ADD CONSTRAINT jobs_service_check CHECK (service IN (
  'Crop surveying', 'Mapping', 'Crop monitoring', 'Livestock monitoring',
  'Multispectral imaging', 'Infrastructure inspection', 'Spraying'
));

UPDATE operator_profiles
SET services = array_replace(array_replace(services, 'Surveying', 'Crop surveying'), 'Monitoring', 'Crop monitoring')
WHERE services && ARRAY['Surveying', 'Monitoring'];
