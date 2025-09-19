import express from 'express';
import authRoutes from './api/routes/auth_routes.js';
import userRoutes from './api/routes/user_routes.js';
import vaccinesRoutes from './api/routes/vaccines_routes.js';
import vaccinePlannerRoutes from './api/routes/vaccine_planner_routes.js';

const app = express();

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/vaccines', vaccinesRoutes);
app.use('/api/planner', vaccinePlannerRoutes);

export default app;
