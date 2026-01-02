import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import authRoutes from './api/routes/auth_routes.js';
import userRoutes from './api/routes/user_routes.js';
import vaccinesRoutes from './api/routes/vaccines_routes.js';
import notificationPermissionsRoutes from './api/routes/notification_permissions_routes.js';
import dashboardRoutes from './api/routes/dashboard_routes.js';
import dependentsRoutes from './api/routes/dependents_routes.js';
import relationshipsRoutes from './api/routes/relationships_routes.js';
import adminRoutes from './api/routes/admin_routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://salek-frontend.onrender.com',
      'https://salek-backend-v1.onrender.com',
      'http://13.205.36.240',
      'https://13.205.36.240',
      'https://myvaxine.com',
    ];

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

app.use(express.json());

// Let cors() handle preflight automatically; no explicit options route to avoid path-to-regexp issues

// Serve static files with proper configuration
const uploadsPath = path.join(__dirname, '../public/uploads');
console.log('📁 Uploads path:', uploadsPath);
app.use('/uploads', express.static(uploadsPath, {
  maxAge: '1y', // Cache for 1 year
  etag: true,
  lastModified: true,
  immutable: true // Tell browsers the file won't change
}));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/vaccines', vaccinesRoutes);
app.use('/api/notifications', notificationPermissionsRoutes);
app.use('/api/dependents', dependentsRoutes);
app.use('/api/relationships', relationshipsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', dashboardRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Salek Backend API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      user: '/api/user',
      vaccines: '/api/vaccines',
      dependents: '/api/dependents',
      relationships: '/api/relationships',
      admin: '/api/admin',
      dashboard: '/api'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler - but not for static files
app.use((req, res) => {
  // Skip 404 for static file requests that are already handled
  if (req.path.startsWith('/uploads/')) {
    return res.status(404).json({
      success: false,
      message: 'Image not found'
    });
  }

  res.status(404).json({
    success: false,
    message: 'Route not found',
    availableEndpoints: {
      root: '/',
      health: '/health',
      auth: '/api/auth',
      user: '/api/user',
      vaccines: '/api/vaccines',
      dependents: '/api/dependents',
      relationships: '/api/relationships',
      admin: '/api/admin',
      dashboard: '/api'
    }
  });
});

export default app;