#!/bin/bash

echo "🔧 Fixing Salek Server Setup"
echo "============================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SERVER_IP="13.205.36.240"

echo -e "${YELLOW}Step 1: Fixing SSH Key Access${NC}"
echo "Run this on your LOCAL MACHINE (not on the current server):"
echo ""
echo "# Check if key exists"
echo "ls -la ~/salek_test.pem"
echo ""
echo "# Set correct permissions"
echo "chmod 600 ~/salek_test.pem"
echo ""
echo "# Test SSH connection"
echo "ssh -i ~/salek_test.pem ubuntu@$SERVER_IP 'echo \"SSH working\"'"
echo ""

echo -e "${YELLOW}Step 2: Once SSH works, run these commands ON THE SERVER:$SERVER_IP${NC}"
echo ""

echo "# Become root"
echo "sudo su -"
echo ""

echo "# Install Nginx if not installed"
echo "apt update"
echo "apt install -y nginx"
echo ""

echo "# Create Nginx configuration"
cat << 'EOF'
cat > /etc/nginx/sites-available/salek << 'NGINX_EOF'
server {
    listen 80;
    server_name 13.205.36.240;

    # Frontend (port 80 - main domain)
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Backend API (port 3000)
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60;
        proxy_connect_timeout 60;
        proxy_send_timeout 60;
    }

    # Uploads
    location /uploads/ {
        proxy_pass http://localhost:3000/uploads/;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
NGINX_EOF
EOF

echo ""
echo "# Enable the site"
echo "ln -sf /etc/nginx/sites-available/salek /etc/nginx/sites-enabled/"
echo "rm -f /etc/nginx/sites-enabled/default"
echo ""

echo "# Test nginx configuration"
echo "nginx -t"
echo ""

echo "# Reload nginx"
echo "systemctl reload nginx"
echo "systemctl status nginx"
echo ""

echo "# Check backend"
echo "cd ~/salek-backend"
echo "npm install -g pm2"
echo "export PORT=3000"
echo "pm2 start server.js --name salek-backend"
echo "pm2 status"
echo ""

echo "# Setup PM2 auto-startup"
echo "pm2 save"
echo "pm2 startup systemd -u ubuntu --hp /home/ubuntu"
echo ""

echo "# Check frontend (port 3001)"
echo "lsof -i :3001 || echo 'Frontend not running on port 3001'"
echo ""

echo "# If frontend not running, start it"
echo "cd ~/frontend-app  # Change to your frontend directory"
echo "npm install"
echo "npm start"
echo ""

echo -e "${YELLOW}Step 3: Testing Commands${NC}"
echo ""

echo "# Test frontend (port 80)"
echo "curl -I http://$SERVER_IP"
echo ""

echo "# Test backend (port 3000)"
echo "curl http://$SERVER_IP:3000/health"
echo ""

echo "# Test API proxy"
echo "curl http://$SERVER_IP/api/admin/login -X POST \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"username\":\"admin\",\"password\":\"admin123!\"}'"
echo ""

echo "# Check all services"
echo "systemctl status nginx"
echo "pm2 status"
echo "netstat -tlnp | grep -E ':(80|3000|3001)'"
echo ""

echo -e "${GREEN}🎯 Final URLs:${NC}"
echo "Frontend: http://$SERVER_IP"
echo "Backend: http://$SERVER_IP:3000"
echo "API: http://$SERVER_IP/api/"
echo ""

echo -e "${YELLOW}⚠️  Important:${NC}"
echo "1. SSH key should be on your LOCAL machine at ~/salek_test.pem"
echo "2. Run SSH commands from your LOCAL machine"
echo "3. Make sure frontend is running on port 3001"
echo "4. Backend should be on port 3000"


