CREATE TABLE users (
  id int AUTO_INCREMENT PRIMARY KEY,
  email varchar(255) UNIQUE NOT NULL,
  password varchar(255) NOT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE urls (
  id int AUTO_INCREMENT  PRIMARY KEY,
  short_code varchar(255) UNIQUE NOT NULL,
  long_url text NOT NULL,
  user_id int DEFAULT NULL,
  clicks int DEFAULT 0,
  expires_at timestamp NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE click_events (
  id int AUTO_INCREMENT PRIMARY KEY,
  url_id int NOT NULL,
  ip_address varchar(255),
  user_agent text,
  referer text,
  country varchar(255),
  clicked_at timestamp DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE urls ADD FOREIGN KEY (user_id) REFERENCES users (id);

ALTER TABLE click_events ADD FOREIGN KEY (url_id) REFERENCES urls (id);
