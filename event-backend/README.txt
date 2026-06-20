Event Management Backend (Node.js + MySQL)
==========================================

1) MySQL (Workbench) — run:
   CREATE DATABASE event_management;
   USE event_management;
   -- open schema.mysql.sql and run its contents

2) Configure .env
   DB_HOST=localhost
   DB_USER=root
   DB_PASS=Bunny@123
   DB_NAME=event_management

3) Install & run
   npm install
   npm start

4) Test
   http://localhost:3000/api/health

Files:
- server.js (Express API)
- schema.mysql.sql (tables)
- .env (already filled for localhost)
- static/er.svg (ER diagram)
