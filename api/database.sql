
CREATE TABLE IF NOT EXISTS `datafilters` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `expression` varchar(512) NOT NULL DEFAULT '0',
  `description` varchar(100) DEFAULT NULL,
  `units` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Filter data using free-form mathematical expressions. May be implemented using JS eval or math.js.';

CREATE TABLE IF NOT EXISTS `datarunmeta` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location` varchar(100) DEFAULT NULL,
  `description` varchar(100) DEFAULT NULL,
  `type` varchar(100) DEFAULT NULL,
  `runofday` int(10) unsigned DEFAULT NULL,
  `start` timestamp(3) NOT NULL DEFAULT current_timestamp(3),
  `end` timestamp(3) NOT NULL DEFAULT current_timestamp(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Metadata for different runs - includes range of actual data.';

CREATE TABLE IF NOT EXISTS `datavariables` (
  `id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(100) DEFAULT NULL,
  `units` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Names of all variables that have ever been logged. Used as integer reference from datapoints.';

CREATE TABLE IF NOT EXISTS `datapoints` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `time` timestamp(3) NOT NULL DEFAULT current_timestamp(3),
  `variable` smallint(5) unsigned NOT NULL,
  `value` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `datapoints_UN` (`time`,`variable`),
  KEY `datapoints_time_IDX` (`time`) USING BTREE,
  KEY `datapoints_variable_IDX` (`variable`) USING BTREE,
  CONSTRAINT `datapoints_datavariables_FK` FOREIGN KEY (`variable`) REFERENCES `datavariables` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Values of different variables at different times. Data is not stored with a particular run necessarily but rather in sequential order in this large table, and is referenced from the run metadata.';
