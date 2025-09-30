# IRTOMS - Intelligent Railway Traffic Optimization and Management System

A comprehensive railway management system with dual portals (Staff and Admin) that optimizes train movements based on government-fixed routes and dynamic priority-based scheduling.

## 🚂 Features

### Train Priority System
- **VIP Trains (Vande Bharat, Tejas, Rajdhani)**: Zero halts, No delays, Maximum speed priority
- **Superfast Express**: 3-4 halts, 10-15 minutes delay buffer, High priority
- **Express Trains**: 4-5 halts, 20-25 minutes delay tolerance, Medium priority
- **Passenger Trains**: 10-15 halts, 1-2 hours delay acceptable, Low priority
- **Freight Trains**: Unlimited halts, Flexible delay management, Lowest priority

### Portal Architecture

#### Staff Portal (/staff)
- **Driver Login and Train Registration**: Secure authentication and train details input
- **Real-time Journey Dashboard**: Complete route visualization with live tracking
- **Train Management**: Start journey, update position, monitor status
- **Other Trains Visibility**: View other trains on same route with details

#### Admin Portal (/admin)
- **Master Control Panel**: Complete signal management system
- **Emergency Controls**: Emergency stop and start for any train
- **Traffic Overview**: Network-wide monitoring and conflict detection
- **User Management**: Manage driver and admin accounts
- **Intelligent Traffic Optimization**: Automatic priority-based scheduling

### Technical Features
- **Real-time Visualization**: Interactive railway network map with color-coded trains
- **WebSocket Integration**: Live updates for position tracking and emergency alerts
- **Intelligent Scheduling**: Priority-based halt allocation and conflict resolution
- **Security**: Role-based authentication with JWT and session management
- **Responsive Design**: Mobile-friendly interface for field staff

## 🛠 Installation

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd IRTOMS-Railway-Management
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Update the following variables:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Database Configuration
   MONGODB_URI=mongodb://localhost:27017/irtoms_railway
   
   # JWT Configuration
   JWT_SECRET=your_jwt_secret_key_here
   JWT_EXPIRE=24h
   
   # Session Configuration
   SESSION_SECRET=your_session_secret_key_here
   ```

4. **Start MongoDB**
   ```bash
   # Windows
   net start MongoDB
   
   # Linux/Mac
   sudo systemctl start mongod
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   - Home: http://localhost:3000
   - Staff Portal: http://localhost:3000/staff
   - Admin Portal: http://localhost:3000/admin

## 🚀 Usage

### First Time Setup

1. **Create Admin Account**
   ```bash
   # Use the registration API endpoint (admin only can create accounts)
   POST /api/auth/register
   {
     "username": "admin",
     "email": "admin@railway.gov.in",
     "password": "admin123",
     "role": "admin",
     "fullName": "System Administrator",
     "employeeId": "EMP001",
     "phoneNumber": "+91XXXXXXXXXX"
   }
   ```

2. **Create Sample Stations** (via Admin Panel)
   - Add railway stations with GPS coordinates
   - Define station types (Terminal, Junction, Regular, Halt)
   - Set platform counts and facilities

3. **Create Routes** (via Admin Panel)
   - Define routes between stations
   - Set distances and travel times
   - Configure crossing points

### Staff Portal Usage

1. **Login as Driver**
   - Use username/employee ID and password
   - Access driver dashboard

2. **Register Train Journey**
   - Fill train details (number, name, type)
   - Select starting and destination stations
   - Set departure time
   - System automatically assigns priority and constraints

3. **Manage Journey**
   - Start journey when ready
   - Update position regularly (latitude, longitude, speed)
   - Monitor other trains on route
   - View halt stations and crossings

### Admin Portal Usage

1. **Traffic Control**
   - View all active trains on network
   - Monitor priorities and conflicts
   - Issue emergency stops/starts
   - Override train schedules

2. **User Management**
   - Create driver accounts
   - Manage user permissions
   - View activity logs

3. **System Monitoring**
   - Real-time network status
   - Performance analytics
   - Delay reports
   - Conflict resolutions

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - Register new user (Admin only)
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile

### Trains
- `GET /api/trains` - Get all trains
- `POST /api/trains` - Create new train
- `GET /api/trains/:id` - Get train by ID
- `PUT /api/trains/:id` - Update train
- `DELETE /api/trains/:id` - Delete train

### Stations & Routes
- `GET /api/stations` - Get all stations
- `GET /api/routes` - Get all routes

## 🔧 Configuration

### Train Priority Configuration
The system automatically assigns priority based on train type:

```javascript
{
  VIP: { priority: 1, halts: 0, maxDelay: 0, maxSpeed: 160 },
  SUPERFAST_EXPRESS: { priority: 2, halts: 4, maxDelay: 15, maxSpeed: 130 },
  EXPRESS: { priority: 3, halts: 5, maxDelay: 25, maxSpeed: 110 },
  PASSENGER: { priority: 4, halts: 15, maxDelay: 120, maxSpeed: 80 },
  FREIGHT: { priority: 5, halts: 999, maxDelay: 999, maxSpeed: 60 }
}
```

### WebSocket Events
- `train-position-update` - Real-time position updates
- `emergency-alert` - Emergency notifications
- `train-started` - Journey start notifications
- `train-resumed` - Train resumption notifications

## 🏗 Architecture

```
├── config/          # Database and app configuration
├── controllers/     # Business logic
├── middleware/      # Authentication and validation
├── models/          # Database schemas
├── routes/          # API and web routes
├── views/           # EJS templates
│   ├── layouts/     # Common layouts
│   ├── staff/       # Staff portal views
│   └── admin/       # Admin portal views
├── public/          # Static assets
│   ├── css/         # Stylesheets
│   ├── js/          # Client-side JavaScript
│   └── images/      # Images and icons
└── utils/           # Utility functions
```

## 🔒 Security Features
- JWT-based authentication
- Role-based access control
- Session management
- Input validation
- Rate limiting
- CSRF protection
- Helmet.js security headers

## 📱 Real-time Features
- Live train position tracking
- Emergency alert broadcasting
- Train status updates
- Conflict detection notifications
- System-wide announcements

## 🧪 Testing
```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage
```

## 🚀 Deployment

### Production Deployment
1. Set `NODE_ENV=production`
2. Configure production MongoDB instance
3. Set secure JWT and session secrets
4. Enable HTTPS
5. Configure reverse proxy (nginx)
6. Set up process manager (PM2)

```bash
# Using PM2
npm install -g pm2
pm2 start server.js --name "irtoms-railway"
pm2 save
pm2 startup
```

## 🤝 Contributing
1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📄 License
This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support
For support and questions:
- Email: support@irtoms.railway.gov.in
- Documentation: [Wiki](wiki-link)
- Issues: [GitHub Issues](issues-link)

## 🏆 Success Metrics
- On-time performance improvement: 25%+
- Reduced average delay times: 40%+
- Increased track capacity utilization: 30%+
- Faster conflict resolution: 60%+
- Higher priority train punctuality: 95%+

---

**IRTOMS** - *Intelligent Railway Traffic Optimization and Management System*
Making Indian Railways more efficient, one train at a time! 🚂
