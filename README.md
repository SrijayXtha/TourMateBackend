# TourMate — Backend API

> Final Year Project · 6CS007 Project & Professionalism  
> BSc (Hons) Computer Science · Herald College Kathmandu (University of Wolverhampton)

REST API server powering the TourMate mobile app — a guide booking and safety platform for tourists in Nepal.

---

## Features

- 🔐 **Multi-role JWT Authentication** — separate access control for Tourist, Guide, Hotel, and Admin
- 📋 **Guide Management** — verified guide profiles, availability, pricing, and ratings
- 🏨 **Hotel Management** — hotel listings, package bundles, and booking handling
- 📅 **Booking System** — create, update, cancel, and view bookings
- 🚨 **SOS & Incident Reporting** — receive and store emergency alerts and incident reports with location data
- 📊 **Admin Panel API** — verify guides/hotels, manage users, roles, and generate safety analytics
- 🗺 **Location Services** — store and serve location data for maps and incident tracking

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL |
| Authentication | JWT (JSON Web Tokens) |
| API Style | REST |
| Version Control | Git + GitHub |

---

## Project Structure

```
src/
├── controllers/      # Route handler logic
├── routes/           # Express route definitions
├── middleware/       # Auth middleware (JWT verification, role checks)
├── models/           # Database query functions
├── config/           # DB connection and environment config
└── utils/            # Helper functions
```

---

## Getting Started

```bash
# Clone the repo
git clone https://github.com/yourusername/tourmate-backend.git

# Install dependencies
cd tourmate-backend
npm install

# Set up environment variables
cp .env.example .env
# Fill in your DB credentials and JWT secret

# Run the server
npm run dev
```

---

## Environment Variables

```
PORT=5000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_jwt_secret
```

---

## Related

- 🔗 Frontend repo: [TourMate Frontend](https://github.com/SrijayXtha/TourMateFrontEnd)

---

## Status

🚧 Active development — Final Year Project 2025/26
