# Salek Backend

Node.js backend for the Salek project with Express.js, a custom repository layer, and MySQL.

## Project Structure

src/ 
├── api/ 
│   ├── controllers/   # Request handlers 
│   ├── routes/        # API route definitions 
│   └── validators/    # Request validation 
├── config/ 
│   ├── constants.js   # Application-wide constants 
│   ├── db.js          # Database connection (MySQL) 
│   └── logger.js      # Structured logging 
├── core/ 
│   ├── app.js         # Express app setup 
│   └── server.js      # Server startup 
├── middleware/        # Custom middleware 
├── utils/             # Utility functions 
└── tests/             # Unit and integration tests 


## Features

- ✅ Code Quality → ESLint + Prettier with strict naming rules
- ✅ Git Hooks → Husky + lint-staged + custom pre-commit checks
- ✅ Architecture → Clean separation (controllers, services, config, utils)
- ✅ Database → MySQL with repository pattern
- ✅ Constants → Centralized in config/constants.js
- ✅ Logging → Structured logging via config/logger.js

## Setup

### 1. Install dependencies
bash
npm install


### 2. Set up git hooks
bash
npm run prepare


### 3. Environment variables
Create a .env file:

DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_NAME=salak_db
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-in-production


### 4. Run the app
bash
npm start


## Available Scripts

| Script                 | Description                  |
| ---------------------- | ---------------------------- |
| `npm start`            | Start the server             |
| `npm run lint`         | Run ESLint checks            |
| `npm run lint:fix`     | Auto-fix lint issues         |
| `npm run format`       | Format code with Prettier    |
| `npm run check-format` | Check if code is formatted   |
| `npm run pre-commit`   | Run custom pre-commit checks |


## Code Quality Rules

This project enforces strict standards:

### Naming Conventions

- Files: snake_case → user_controller.js
- Variables: camelCase → userName
- Constants: UPPER_CASE → STATUS_ACTIVE
- Classes: PascalCase → UserService

### Pre-commit Checks

- ✅ No TODO/FIXME comments
- ✅ No console.log (use logger.js)
- ✅ Proper file naming
- ✅ No hardcoded strings in controllers or routes
- ✅ Architecture compliance

## Commit Messages

This repo uses [Conventional Commits](https://www.conventionalcommits.org/).

### Format

<type>(<scope>): <description>


### Types

- feat: New feature
- fix: Bug fix
- docs: Documentation changes
- style: Code style changes
- refactor: Code refactoring
- test: Test changes
- chore: Maintenance tasks

### Examples

- feat(auth): add user authentication endpoints
- fix(users): resolve user creation validation bug
- docs(readme): update setup instructions
- refactor(api): move hardcoded strings to constants

## Development

### Adding new features

1. Create feature branch: git checkout -b feature/your-feature
2. Make changes following the coding standards
3. Run checks: npm run lint && npm run pre-commit
4. Commit with conventional commit message
5. Push and create pull request

### Code quality checks run automatically on:

- Every commit (pre-commit hook)
- Every commit message (commit-msg hook)

## License

ISC