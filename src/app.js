import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
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

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/vaccines', vaccinesRoutes);
app.use('/api/notifications', notificationPermissionsRoutes);
app.use('/api/dependents', dependentsRoutes);
app.use('/api/relationships', relationshipsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', dashboardRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

export default app;