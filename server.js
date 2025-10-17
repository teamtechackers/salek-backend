import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { initializeDatabase } from './src/database/init.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import routes
import authRoutes from './src/api/routes/auth_routes.js';
import userRoutes from './src/api/routes/user_routes.js';
import vaccinesRoutes from './src/api/routes/vaccines_routes.js';
import notificationPermissionsRoutes from './src/api/routes/notification_permissions_routes.js';
import dashboardRoutes from './src/api/routes/dashboard_routes.js';
import dependentsRoutes from './src/api/routes/dependents_routes.js';
import relationshipsRoutes from './src/api/routes/relationships_routes.js';
import adminRoutes from './src/api/routes/admin_routes.js';

const app = express();

// Middleware
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'src/public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/vaccines', vaccinesRoutes);
app.use('/api/notifications', notificationPermissionsRoutes);
app.use('/api/dependents', dependentsRoutes);
app.use('/api/relationships', relationshipsRoutes);
app.use('/api', dashboardRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Initialize database
    const dbInitResult = await initializeDatabase();
    if (!dbInitResult.success) {
      console.error('Database initialization failed:', dbInitResult.error);
      process.exit(1);
    }
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
