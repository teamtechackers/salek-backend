import express from 'express';
import authRoutes from './api/routes/auth_routes.js';
import userRoutes from './api/routes/user_routes.js';
import vaccinesRoutes from './api/routes/vaccines_routes.js';

const app = express();

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/vaccines', vaccinesRoutes);

export default app;
