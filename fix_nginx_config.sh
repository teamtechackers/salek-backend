#!/bin/bash

echo "🔧 Fixing Nginx Configuration"
echo "============================"

# Backup current config
cp /etc/nginx/sites-available/salek /etc/nginx/sites-available/salek.backup 2>/dev/null || echo "No backup created"

# Remove corrupted config
rm -f /etc/nginx/sites-enabled/salek
rm -f /etc/nginx/sites-available/salek

# Create clean config
cat > /etc/nginx/sites-available/salek << 'EOF'
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
EOF

# Enable site
ln -sf /etc/nginx/sites-available/salek /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test and reload
nginx -t && systemctl reload nginx

echo "✅ Nginx config fixed!"
echo ""
echo "Current config:"
cat /etc/nginx/sites-available/salek


