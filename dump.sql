PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      password TEXT NOT NULL
    );
INSERT INTO users VALUES('3a121458-de74-4a96-bb82-06577828fcea','jsckyjacky32@gmail.com','Jacky Kwan','$2b$10$n3lix/50NmjMPHZkrAtRiexlOB0UrqjgOisDHiu/JRJQFzIYcbfz6');
INSERT INTO users VALUES('cd1547ea-6976-4e90-9907-e9b6f1987f11','user@example.com','Test User','$2b$10$YBS0B56g7dG7na2ZQOfAc.Cy3DdFbbn/Vg65rg7zpZKi.Ddlyv02G');
CREATE TABLE plans (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      ownerId TEXT NOT NULL,
      FOREIGN KEY (ownerId) REFERENCES users(id)
    );
INSERT INTO plans VALUES('6141eda1-9d59-409a-a0ff-72bb4a4f59fa','Beijing Trip','cd1547ea-6976-4e90-9907-e9b6f1987f11');
INSERT INTO plans VALUES('d3372534-ada7-4b42-a6ec-2e1678a74166','Trip with test user','3a121458-de74-4a96-bb82-06577828fcea');
CREATE TABLE plan_shares (
      planId TEXT,
      userId TEXT,
      PRIMARY KEY (planId, userId),
      FOREIGN KEY (planId) REFERENCES plans(id),
      FOREIGN KEY (userId) REFERENCES users(id)
    );
INSERT INTO plan_shares VALUES('6141eda1-9d59-409a-a0ff-72bb4a4f59fa','3a121458-de74-4a96-bb82-06577828fcea');
INSERT INTO plan_shares VALUES('d3372534-ada7-4b42-a6ec-2e1678a74166','cd1547ea-6976-4e90-9907-e9b6f1987f11');
CREATE TABLE activities (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      destination TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      startTime TEXT,
      endTime TEXT,
      activities TEXT,
      ownerId TEXT NOT NULL,
      planId TEXT NOT NULL,
      FOREIGN KEY (ownerId) REFERENCES users(id),
      FOREIGN KEY (planId) REFERENCES plans(id)
    );
INSERT INTO activities VALUES('348c5227-9b65-45bd-83af-442f6a05df3a','Tiananmen Square','Tiananmen Square','2025-05-26','2025-05-26','12:00','13:47',NULL,'cd1547ea-6976-4e90-9907-e9b6f1987f11','6141eda1-9d59-409a-a0ff-72bb4a4f59fa');
INSERT INTO activities VALUES('80d08d1d-ac2a-4f18-83e8-77b596e24caf','go to Hong Kong','Hong Kong','2025-05-26','2025-05-26','12:33','23:34',NULL,'3a121458-de74-4a96-bb82-06577828fcea','d3372534-ada7-4b42-a6ec-2e1678a74166');
INSERT INTO activities VALUES('917f5225-6e98-48c8-abe6-81547e5adfb9','go to Taiwan','Taipei','2025-05-27','2025-05-28','04:19','23:20',NULL,'3a121458-de74-4a96-bb82-06577828fcea','d3372534-ada7-4b42-a6ec-2e1678a74166');
INSERT INTO activities VALUES('859b0bb9-ba30-48f5-8efc-e99acfa42b70','go to bangkok','Bangkok','2025-05-24','2025-05-24',NULL,NULL,NULL,'3a121458-de74-4a96-bb82-06577828fcea','d3372534-ada7-4b42-a6ec-2e1678a74166');
COMMIT;
