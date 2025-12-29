#!/bin/bash

echo "🔍 Checking which server we're actually on..."
echo "=========================================="

# Check hostname and IPs
echo "Hostname: $(hostname)"
echo "Current IP: $(curl -s ifconfig.me || curl -s icanhazip.com)"
echo "Local IPs:"
ip addr show | grep "inet " | grep -v "127.0.0.1"

echo ""
echo "Server Details:"
echo "==============="
echo "Uptime: $(uptime)"
echo "OS: $(lsb_release -d | cut -f2)"
echo "Kernel: $(uname -r)"

echo ""
echo "AWS Instance Info:"
echo "=================="
curl -s http://169.254.169.254/latest/meta-data/instance-id 2>/dev/null || echo "Not AWS instance"
curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || echo "No public IP metadata"

echo ""
echo "Directories:"
echo "==========="
ls -la ~/ | head -10

echo ""
echo "Services:"
echo "========"
systemctl status nginx --no-pager 2>/dev/null || echo "Nginx not running"
pm2 list 2>/dev/null || echo "PM2 not installed"

echo ""
echo "Network check:"
echo "=============="
ping -c 1 13.205.36.240 >/dev/null && echo "✅ Can reach 13.205.36.240" || echo "❌ Cannot reach 13.205.36.240"


