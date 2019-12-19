CREATE TABLE `datarunmeta` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `location` varchar(100) DEFAULT NULL,
  `description` varchar(100) DEFAULT NULL,
  `type` varchar(100) DEFAULT NULL,
  `runofday` int(10) unsigned DEFAULT NULL,
  `start` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `end` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=175 DEFAULT CHARSET=utf8mb4 COMMENT='Metadata for different runs - includes range of actual data.';

CREATE TABLE `datavariables` (
  `id` smallint(5) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COMMENT='Names of all variables that have ever been logged. Used as integer reference from datapoints.';

CREATE TABLE `datafilters` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `expression` varchar(512) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COMMENT='Filter data using free-form mathematical expressions. May be implemented using JS eval or math.js.';

CREATE TABLE `datapoints` (
  `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT,
  `time` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `variable` smallint(5) unsigned NOT NULL,
  `value` double DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `datapoints_time_IDX` (`time`) USING BTREE,
  KEY `datapoints_time_var_IDX` (`time`,`variable`) USING BTREE,
  KEY `datapoints_all_IDX` (`time`,`variable`,`value`) USING BTREE,
  KEY `datapoints_variable_IDX` (`variable`) USING BTREE,
  CONSTRAINT `datapoints_datavariables_FK` FOREIGN KEY (`variable`) REFERENCES `datavariables` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9456447 DEFAULT CHARSET=utf8mb4 COMMENT='Values of different variables at different times. Data is not stored with a particular run necessarily but rather in sequential order in this large table, and is referenced from the run metadata.';


ALTER TABLE datafilters ADD COLUMN description VARCHAR(100);
ALTER TABLE datafilters ADD COLUMN units VARCHAR(20);
ALTER TABLE datavariables ADD COLUMN description VARCHAR(100);
ALTER TABLE datavariables ADD COLUMN units VARCHAR(20);
