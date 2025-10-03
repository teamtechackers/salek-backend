import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './api/routes/auth_routes.js';
import userRoutes from './api/routes/user_routes.js';
import vaccinesRoutes from './api/routes/vaccines_routes.js';
import notificationPermissionsRoutes from './api/routes/notification_permissions_routes.js';
import dashboardRoutes from './api/routes/dashboard_routes.js';
import dependentsRoutes from './api/routes/dependents_routes.js';

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
app.use('/api', dashboardRoutes);

export default app;