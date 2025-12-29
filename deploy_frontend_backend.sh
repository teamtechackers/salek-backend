#!/bin/bash

echo "🚀 Deploying Salek Frontend & Backend on AWS EC2"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SERVER_IP="13.205.36.240"
KEY_FILE="$HOME/salek_test.pem"
FRONTEND_PORT="3001"  # Change this to your frontend port
BACKEND_PORT="3000"

echo -e "${YELLOW}Configuration:${NC}"
echo "Server IP: $SERVER_IP"
echo "SSH Key: $KEY_FILE"
echo "Frontend Port: $FRONTEND_PORT"
echo "Backend Port: $BACKEND_PORT"
echo ""

# Function to run commands on server
run_on_server() {
    local cmd="$1"
    echo -e "${GREEN}Running on server:${NC} $cmd"
    ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ubuntu@"$SERVER_IP" "$cmd"
}

echo -e "${YELLOW}Step 1: Testing SSH connection...${NC}"
if ! ssh -i "$KEY_FILE" -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@"$SERVER_IP" "echo 'SSH connection successful'" 2>/dev/null; then
    echo -e "${RED}❌ SSH connection failed!${NC}"
    echo "Make sure:"
    echo "1. SSH key file exists at: $KEY_FILE"
    echo "2. Key has correct permissions: chmod 600 $KEY_FILE"
    echo "3. Server is accessible"
    exit 1
fi
echo -e "${GREEN}✅ SSH connection successful${NC}"
echo ""

echo -e "${YELLOW}Step 2: Installing Nginx...${NC}"
run_on_server "
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
echo '✅ Nginx installed and started'
"

echo -e "${YELLOW}Step 3: Configuring Nginx for Frontend + Backend...${NC}"
run_on_server "
sudo tee /etc/nginx/sites-available/salek > /dev/null << EOF
server {
    listen 80;
    server_name $SERVER_IP;

    # Frontend (port 80 - main domain)
    location / {
        proxy_pass http://localhost:$FRONTEND_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # For React/Next.js SPA
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Backend API (port 3000)
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        # API specific settings
        proxy_read_timeout 60;
        proxy_connect_timeout 60;
        proxy_send_timeout 60;
    }

    # Uploads (images and files)
    location /uploads/ {
        proxy_pass http://localhost:$BACKEND_PORT/uploads/;
        expires 1y;
        add_header Cache-Control \"public\";
    }

    # Security headers
    add_header X-Frame-Options \"SAMEORIGIN\" always;
    add_header X-XSS-Protection \"1; mode=block\" always;
    add_header X-Content-Type-Options \"nosniff\" always;
    add_header Referrer-Policy \"no-referrer-when-downgrade\" always;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/salek /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

echo '✅ Nginx configuration completed'
"

echo -e "${YELLOW}Step 4: Checking Backend Status...${NC}"
run_on_server "
cd ~/salek-backend

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# Check if backend is running
if pm2 list | grep -q 'salek-backend'; then
    echo 'Backend is already running'
    pm2 status
else
    echo 'Starting backend...'
    export PORT=$BACKEND_PORT
    export NODE_ENV=production
    pm2 start server.js --name salek-backend
    pm2 save
    pm2 startup
fi

# Show backend status
pm2 status
pm2 logs salek-backend --lines 3
"

echo -e "${YELLOW}Step 5: Starting Frontend...${NC}"
run_on_server "
# Check if frontend is already running on the specified port
if lsof -Pi :$FRONTEND_PORT -sTCP:LISTEN -t >/dev/null; then
    echo \"Frontend is already running on port $FRONTEND_PORT\"
    lsof -i :$FRONTEND_PORT
else
    echo \"Frontend not found on port $FRONTEND_PORT\"
    echo \"Please make sure your frontend is running on port $FRONTEND_PORT\"
    echo \"\"
    echo \"If frontend is in ~/frontend-app directory, run:\"
    echo \"cd ~/frontend-app && npm install && npm start\"
fi
"

echo -e "${YELLOW}Step 6: Reloading Nginx...${NC}"
run_on_server "
sudo systemctl reload nginx
sudo systemctl status nginx --no-pager
echo '✅ Nginx reloaded successfully'
"

echo -e "${YELLOW}Step 7: Testing Deployment...${NC}"
echo "Testing frontend..."
if curl -s -I http://$SERVER_IP | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✅ Frontend accessible at: http://$SERVER_IP${NC}"
else
    echo -e "${RED}❌ Frontend not accessible${NC}"
fi

echo "Testing backend API..."
if curl -s http://$SERVER_IP:$BACKEND_PORT/health | grep -q "success"; then
    echo -e "${GREEN}✅ Backend accessible at: http://$SERVER_IP:$BACKEND_PORT${NC}"
else
    echo -e "${RED}❌ Backend not accessible${NC}"
fi

echo "Testing API proxy..."
if curl -s http://$SERVER_IP/api/admin/login -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123!"}' | grep -q "success\|error"; then
    echo -e "${GREEN}✅ API proxy working: http://$SERVER_IP/api/${NC}"
else
    echo -e "${RED}❌ API proxy not working${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment Summary:${NC}"
echo "=================================="
echo -e "Frontend: ${GREEN}http://$SERVER_IP${NC} (port 80)"
echo -e "Backend: ${GREEN}http://$SERVER_IP:$BACKEND_PORT${NC} (port $BACKEND_PORT)"
echo -e "API Proxy: ${GREEN}http://$SERVER_IP/api/${NC}"
echo ""
echo -e "${YELLOW}Note: Make sure frontend is running on port $FRONTEND_PORT${NC}"
echo -e "${YELLOW}If frontend port is different, update FRONTEND_PORT variable and re-run${NC}"


