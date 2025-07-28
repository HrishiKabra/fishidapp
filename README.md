<p align="center">
  <img src="./logo.png" alt="FishID Logo" width="220"/>
</p>

# FishID

**AI-Powered Fish Species Identification**

FishID is a full-stack web application that lets you identify fish species from photos using advanced AI, and provides fun, easy-to-understand facts about each fish. Built for divers, hobbyists, and marine enthusiasts!

---

## 🌐 Demo
- **Live App:** [fishid.vercel.app](https://fishid.vercel.app)

---

## 🛠 Tech Stack
- **Frontend:** Next.js (React, TypeScript, Tailwind CSS)
- **Backend:** Flask (Python)
- **Database:** SQLite (for user/auth and fish cache)
- **AI/ML:** Fishial API, Groq, FishBase, Wikipedia
- **Authentication:** JWT, bcrypt
- **Deployment:** Vercel (frontend), Render (backend)

---

## 🚀 Features
- **AI Fish Identification:** Upload a photo and get instant species results
- **Simple Descriptions:** Friendly, non-scientific facts for every fish
- **Visual Cues:** Easy-to-read, bolded bullet points for ID
- **User Accounts:** Secure registration, login, and persistent sessions
- **Personal Fish Log:** Save and view your identifications
- **Fun Facts:** Trivia for every species
- **Mobile Friendly:** Responsive, modern UI

---

## 📦 Setup & Usage

### 1. **Clone the Repo**
```bash
git clone https://github.com/HrishiKabra/fishidapp.git
cd fishidapp
```

### 2. **Backend Setup**
```bash
pip install -r requirements.txt
```
Create a `.env` file:
```
FISHIAL_CLIENT_ID=your_fishial_client_id
FISHIAL_SECRET=your_fishial_secret
GROQ_API_KEY=your_groq_key
SECRET_KEY=your_flask_secret_key
JWT_SECRET_KEY=your_jwt_secret
```
Run the backend:
```bash
python app.py
```

### 3. **Frontend Setup**
```bash
cd fishid-landing
npm install
```
Set the backend URL in `.env.local`:
```
NEXT_PUBLIC_FLASK_API_URL=http://localhost:5001
```
Run the frontend:
```bash
npm run dev
```

---

## 📝 API Endpoints (Backend)
- `POST /api/auth/register` — Register
- `POST /api/auth/login` — Login
- `POST /api/auth/verify` — Verify JWT
- `POST /api/auth/logout` — Logout
- `POST /api/fish/identify` — Identify fish from image
- `GET /api/fish/history` — Get user’s fish log
- `POST /api/fish/save` — Save an identification
- `GET /health` — Health check

---

## 📄 License
This project is licensed under the [MIT License](./LICENSE).

---

## 👤 Contact
- **Author:** Hrishi Kabra
- **Email:** kabrahrishi@gmail.com
- **Instagram:** [@hrishikabra](https://instagram.com/hrishikabra)
- **LinkedIn:** [Hrishi Kabra](https://linkedin.com/in/HrishiKabra)

---

## 🙏 Attribution
- FishBase, Wikipedia, Groq, and Fishial APIs for data and AI
- Open source libraries as listed in `requirements.txt` and `package.json`

---

**Enjoy identifying fish! 🐟✨** 