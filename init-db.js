const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const path = require('path');

const prismaDir = path.join(__dirname, 'prisma');
if (!fs.existsSync(prismaDir)){
    fs.mkdirSync(prismaDir);
}

const dbPath = path.join(prismaDir, 'dev.db');
const database = new DatabaseSync(dbPath);

database.exec(`
CREATE TABLE IF NOT EXISTS Business (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS Service (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    duration INTEGER NOT NULL,
    businessId TEXT NOT NULL,
    FOREIGN KEY (businessId) REFERENCES Business(id)
);

CREATE TABLE IF NOT EXISTS WorkingHours (
    id TEXT PRIMARY KEY,
    dayOfWeek TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endTime TEXT NOT NULL,
    businessId TEXT NOT NULL,
    FOREIGN KEY (businessId) REFERENCES Business(id)
);

CREATE TABLE IF NOT EXISTS Appointment (
    id TEXT PRIMARY KEY,
    customerName TEXT NOT NULL,
    customerPhone TEXT NOT NULL,
    serviceId TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING',
    businessId TEXT NOT NULL,
    FOREIGN KEY (serviceId) REFERENCES Service(id),
    FOREIGN KEY (businessId) REFERENCES Business(id)
);

INSERT OR IGNORE INTO Business (id, name, slug) VALUES ('biz_1', 'سالن زیبایی رز', 'rose-salon');

INSERT OR IGNORE INTO Service (id, name, price, duration, businessId) VALUES 
('serv_1', 'کوتاهی مو', 250000, 30, 'biz_1'),
('serv_2', 'اصلاح و آرایش صورت', 300000, 45, 'biz_1'),
('serv_3', 'رنگ و لایت مو', 1200000, 120, 'biz_1');
`);

console.log('Database and tables created successfully!');