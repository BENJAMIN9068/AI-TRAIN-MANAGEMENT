# 🚂 IRTOMS - Indian Railway Management System

**Ultra-Modern Railway Traffic Optimization and Management System** exclusively focused on Indian Railways with real-time tracking, intelligent operations, and stunning visual interface.

![Railway System](https://img.shields.io/badge/Indian%20Railways-Focus-orange)
![Tech Stack](https://img.shields.io/badge/Tech-Node.js%20%7C%20MongoDB%20%7C%20Leaflet-blue)
![Deployment](https://img.shields.io/badge/Deploy-Netlify%20Ready-success)

## ✨ Key Features

- **🇮🇳 Indian Railway Focused**: Map restricted to Indian geographical boundaries only
- **🗺️ Interactive Railway Map**: Real-time train tracking with OpenRailwayMap integration  
- **🎨 Ultra-Realistic UI**: Modern glassmorphism design with advanced animations
- **📱 Mobile Responsive**: Optimized for all devices with adaptive design
- **⚡ Real-Time Updates**: Live train position monitoring and status updates
- **🔐 Secure Authentication**: JWT-based login system with MongoDB Atlas
- **🌐 Cloud-Ready**: Deployed on Netlify with serverless functions

## 🚀 Live Demo

**🌐 Live Site**: [Your Netlify URL here]
**📂 GitHub**: https://github.com/BENJAMIN9068/AI-TRAIN-MANAGEMENT

### 🔑 Demo Credentials
- **Admin**: `admin` / `admin123`
- **Staff**: `staff` / `staff123`

## 🛠️ Technology Stack

- **Frontend**: HTML5, CSS3 (Glassmorphism), JavaScript ES6+
- **Backend**: Node.js, Express.js, Netlify Functions
- **Database**: MongoDB Atlas (Cloud)
- **Maps**: Leaflet.js + OpenRailwayMap (India-focused)
- **Authentication**: JWT, bcryptjs
- **UI Framework**: Bootstrap 5 with custom animations
- **Deployment**: Netlify (Frontend + Functions) + MongoDB Atlas

## 🚀 Quick Deploy to Netlify

1. **Fork this repository** on GitHub

2. **Create MongoDB Atlas account** (free tier):
   - Sign up at https://cloud.mongodb.com
   - Create a cluster and database user
   - Get connection string

3. **Deploy to Netlify**:
   - Connect your GitHub repo to Netlify
   - Build settings:
     ```
     Build command: npm run build:netlify
     Publish directory: public
     Functions directory: netlify/functions
     ```

4. **Set Environment Variables** in Netlify:
   ```bash
   MONGODB_URI=mongodb+srv://IRTOMS:2lpMO6tobZ90y1K7@cluster0.mongodb.net/irtoms_railway?retryWrites=true&w=majority
   JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_2024
   SESSION_SECRET=your_super_secret_session_key_change_this_in_production_2024
   NODE_ENV=production
   ```

5. **Deploy!** - Your site will be live in minutes! 🎉

## 💻 Local Development

```bash
# Clone the repository
git clone https://github.com/BENJAMIN9068/AI-TRAIN-MANAGEMENT.git
cd AI-TRAIN-MANAGEMENT

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
# Edit .env with your MongoDB Atlas connection string

# Start development server
npm run dev

# Visit http://localhost:3000
```

## 🗺️ Indian Railway Map Features

- **Geographical Bounds**: Restricted to India (6°-37°N, 68°-98°E)
- **Major Stations**: 30+ pre-loaded Indian railway stations
- **Real-Time Tracking**: Live train position updates
- **Interactive Elements**: Click stations and trains for details
- **Demo Mode**: Sample trains for testing functionality

## 🎨 Design Highlights

- **Glassmorphism UI**: Modern frosted glass effects
- **Advanced Animations**: Smooth transitions with cubic-bezier curves
- **Gradient Backgrounds**: Railway-themed color palette
- **Micro-interactions**: Button hover effects and loading states
- **Responsive Design**: Mobile-first approach
- **Performance Optimized**: GPU-accelerated animations

## 📱 API Endpoints (Netlify Functions)

- `POST /api/auth-login` - User authentication
- `GET /api/health` - System health check
- More endpoints can be added in `netlify/functions/`

## 🔧 Key Configuration Files

- `netlify.toml` - Netlify build and routing configuration
- `package.json` - Dependencies and build scripts
- `.env.example` - Environment variables template
- `public/index.html` - Main application file
- `public/css/style.css` - Ultra-realistic styling
- `public/js/railway-map.js` - Indian Railway map component

## 🏗️ Project Structure

```
├── netlify/
│   └── functions/          # Serverless functions for Netlify
├── public/                 # Static frontend files
│   ├── css/               # Ultra-realistic styling
│   ├── js/                # Interactive components
│   └── index.html         # Main application
├── config/                # Database configuration
├── models/                # MongoDB schemas
├── routes/                # Express routes (for local dev)
├── services/              # Business logic services
└── views/                 # EJS templates (for local dev)
```

## 🌟 Key Components

### Railway Map System
- **India-bounded map** with geographical restrictions
- **Interactive train markers** with real-time updates
- **Station information** with click-to-view details
- **OpenRailwayMap integration** for accurate railway data

### Authentication System
- **JWT-based security** with MongoDB Atlas storage
- **Role-based access** (Admin/Staff portals)
- **Secure password hashing** with bcryptjs
- **Session management** for persistent login

### Ultra-Modern UI
- **Glassmorphism design** with backdrop blur effects
- **Advanced CSS animations** with hardware acceleration
- **Responsive layout** optimized for all screen sizes
- **Interactive elements** with smooth hover effects

## 🔒 Security Features

- JWT token authentication
- Secure password hashing
- Environment variable protection
- CORS configuration
- Input validation and sanitization

## 📱 Responsive Design

- Mobile-first approach
- Adaptive components for all screen sizes
- Touch-friendly interface elements
- Optimized performance on mobile devices

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License - feel free to use this project for learning and development!

## 🆘 Support

Need help? Open an issue on GitHub or check the deployment guide in the repository.

## 🚀 Deployment Guide

### For Netlify Deployment:
1. **GitHub Integration**: Connect your forked repo
2. **Build Settings**: Configure build command and publish directory
3. **Environment Variables**: Add MongoDB Atlas and JWT secrets
4. **Domain Configuration**: Optional custom domain setup
5. **Continuous Deployment**: Auto-deploy on every GitHub push

### For MongoDB Atlas Setup:
1. **Create Account**: Sign up for free tier
2. **Create Cluster**: Choose M0 (free) cluster
3. **Network Access**: Allow all IPs (0.0.0.0/0) for development
4. **Database User**: Create user with read/write permissions
5. **Connection String**: Copy and use in environment variables

---

**Made with ❤️ for Indian Railways** 🇮🇳

*Ultra-modern railway management with real-time tracking and stunning visual design*