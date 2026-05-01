# 🏫 Department Guide System

> A real-world offline web application deployed directly on a wireless router using OpenWrt Linux — no internet, no cloud, no cost.

![OpenWrt](https://img.shields.io/badge/Firmware-OpenWrt-blue?style=flat-square)
![Python](https://img.shields.io/badge/Python-3.14-green?style=flat-square)
![Flask](https://img.shields.io/badge/Flask-3.1.3-red?style=flat-square)
![Hardware](https://img.shields.io/badge/Hardware-Sercomm%20S3%20AC2100-orange?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)

---

## 📌 Overview

The **Department Guide System** is a full-stack web application that runs entirely on a consumer wireless router. Students and staff connect to the router's WiFi and instantly access department information — timetables, teachers, announcements, and submissions — without needing any internet connection.

When a device connects to the WiFi, a **captive portal** automatically redirects users to the website, just like airport or hotel WiFi login pages.

---

## 🌟 Key Features

| Feature | Description |
|---|---|
| 📅 **Timetable Management** | View and edit timetables for CE, Cyber, IST departments |
| 👨‍🏫 **Teacher Directory** | Browse and manage teacher information |
| 📢 **Announcements** | Post and view department announcements |
| 📁 **File Submissions** | Students can submit documents online |
| 🔐 **Admin Panel** | Secure admin login with password hashing |
| 🔄 **Backup & Restore** | One-click backup with password-protected restore |
| 📡 **Captive Portal** | Auto-redirects users when connecting to WiFi |
| 🔘 **Reset Button** | Router reset button restores data (factory reset blocked) |
| ♾️ **Auto-Start** | Survives router reboots via procd service |
|Enable-faculty_chat| Now faculty can chat and share files

---

## 🖥️ Hardware & Software

### Hardware
- **Router:** Sercomm S3 AC2100 (Etisalat branded)
- **Chipset:** MediaTek MT7621AT — 880MHz quad-core
- **RAM:** 256MB (187MB free during operation)
- **Storage:** 128MB NAND (60MB free overlay)
- **WiFi:** Dual band — 2.4GHz + 5GHz
- **USB:** USB 3.0 port

### Software Stack
| Layer | Technology |
|---|---|
| Firmware | OpenWrt SNAPSHOT r34136 |
| Runtime | Python 3.14.4 |
| Framework | Flask 3.1.3 |
| Template Engine | Jinja2 3.1.6 |
| DNS Server | dnsmasq (built-in) |
| Web Server | uhttpd (port 8080 for admin) |
| Firewall | iptables-nft |
| Init System | procd |
| Package Manager | APK |

---

## 📁 Project Structure

```
Department_Guide/
│
├── app.py                          # Main Flask application
│
├── templates/                      # HTML templates (Jinja2)
│   ├── index.html                  # Main landing page
│   ├── landing.html                # Student landing page
│   ├── admin_login.html            # Admin login page
│   ├── admin_data.html             # Admin dashboard
│   ├── edit_teachers.html          # Teacher management
│   ├── edit_announcements.html     # Announcement management
│   ├── create_timetable.html       # Create new timetable
│   ├── edit_timetable.html         # Edit existing timetable
│   ├── submit.html                 # Student file submission
│   ├── view_submissions.html       # View all submissions
│   ├── my_submissions.html         # Student's own submissions
│   ├── change_password.html        # Admin password change
│   └── reset_confirm.html          # Reset confirmation page
│
├── data/                           # JSON data storage
│   ├── config.json                 # Admin credentials
│   ├── teachers.json               # Teacher records
│   ├── announcements.json          # Department announcements
│   ├── submissions.json            # Student submissions
│   ├── timetable_ce_A.json         # CE Section A timetable
│   ├── timetable_ce_B.json         # CE Section B timetable
│   ├── timetable_cyber_A.json      # Cyber Section A timetable
│   ├── timetable_cyber_B.json      # Cyber Section B timetable
│   ├── timetable_ist_A.json        # IST Section A timetable
│   └── timetable_ist_B.json        # IST Section B timetable
│
├── uploads/                        # Student uploaded files
│
├── router-config/                  # Router configuration files
│   ├── captive_check.py            # Captive portal Flask app (port 80)
│   ├── webapp.init                 # procd service for Flask app
│   ├── captive.init                # procd service for captive portal
│   ├── rc.local                    # Startup iptables rules
│   ├── rc.button.reset             # Reset button script
│   └── dnsmasq.conf                # DNS interception config
│
└── docs/                           # Documentation
    ├── Feasibility_Report.pdf      # Technical feasibility report
    ├── Enhanced_Feasibility_Report.pdf
    └── Uses_Cases_and_design_analysis_Report.pdf
```

---

## 🚀 Deployment Guide

### Prerequisites
- Router running OpenWrt (tested on Sercomm S3 AC2100)
- Laptop with WiFi + ethernet adapter
- USB drive (optional, for backup)

### Step 1 — Connect to Router
```bash
# Assign static IP on your ethernet adapter
sudo ip addr add 192.168.1.100/24 dev enp0s20u1
sudo ip link set enp0s20u1 up

# SSH into router
ssh root@192.168.1.1
```

### Step 2 — Share Internet to Router
```bash
# On laptop — share WiFi to router
sudo sysctl net.ipv4.ip_forward=1
sudo iptables -t nat -A POSTROUTING -o wlan0 -j MASQUERADE
sudo iptables -P FORWARD ACCEPT

# On router — set gateway
ip route add default via 192.168.1.100
echo "nameserver 8.8.8.8" > /etc/resolv.conf
```

### Step 3 — Install Packages
```bash
apk update
apk add python3 python3-flask python3-werkzeug luci uhttpd \
        kmod-usb3 kmod-usb-storage block-mount kmod-fs-ext4 \
        kmod-fs-vfat nodogsplash python3-pip
```

### Step 4 — Transfer Project Files
```bash
# On laptop
scp -O -r /path/to/Department_Guide/ root@192.168.1.1:/root/
```

### Step 5 — Configure WiFi
```bash
uci set wireless.default_radio0.disabled='0'
uci set wireless.default_radio0.ssid='DepartmentGuide'
uci set wireless.default_radio1.disabled='0'
uci set wireless.default_radio1.ssid='DepartmentGuide'
uci commit wireless
wifi up
```

### Step 6 — Setup Captive Portal
```bash
# Copy captive_check.py to router
scp -O router-config/captive_check.py root@192.168.1.1:/root/

# Configure DNS interception
scp -O router-config/dnsmasq.conf root@192.168.1.1:/etc/dnsmasq.conf
/etc/init.d/dnsmasq restart

# Add iptables rules
iptables -t nat -A PREROUTING -i br-lan -p tcp --dport 80 -j REDIRECT --to-port 80
```

### Step 7 — Setup Auto-Start Services
```bash
# Copy service files
scp -O router-config/webapp.init root@192.168.1.1:/etc/init.d/webapp
scp -O router-config/captive.init root@192.168.1.1:/etc/init.d/captive
chmod +x /etc/init.d/webapp /etc/init.d/captive
/etc/init.d/webapp enable && /etc/init.d/webapp start
/etc/init.d/captive enable && /etc/init.d/captive start
```

### Step 8 — Setup Reset Button
```bash
scp -O router-config/rc.button.reset root@192.168.1.1:/etc/rc.button/reset
chmod +x /etc/rc.button/reset
```

---

## 🌐 Accessing the System

| URL | Purpose |
|---|---|
| `http://192.168.1.1` | Main website (auto-redirect) |
| `http://192.168.1.1:5000` | Direct Flask access |
| `http://192.168.1.1:8080` | LuCI router admin panel |
| `http://192.168.1.1:5000/admin` | Department Guide admin panel |

---

## 🔘 Reset Button Behavior

| Action | Result |
|---|---|
| Short press (< 3 sec) | Restores all data to default backup |
| Long press (> 10 sec) | **BLOCKED** — factory reset disabled |

---

## 📦 Packages Installed

| Package | Version | Purpose |
|---|---|---|
| python3 | 3.14.4 | Python runtime |
| python3-flask | 3.1.3 | Web framework |
| python3-werkzeug | 3.1.8 | WSGI toolkit |
| luci | 26.114.56040 | Router web UI |
| uhttpd | 2025.10.03 | HTTP server |
| nodogsplash | 5.0.2 | Captive portal |
| kmod-usb3 | 6.12.80 | USB 3.0 support |

---

## ⚠️ Known Limitations

- Captive portal popup may not appear on Samsung S23 Ultra and some ColorOS devices
- Connected clients have no internet access (offline-only design)
- Flask runs in development mode (sufficient for local LAN)

---

## 👥 Team

**University Software Engineering Project**
- GitHub: [@nnna21](https://github.com/nnna21)

---

## 📄 License

This project is licensed under the MIT License.

---

> *"Deployed on real hardware. Zero cloud. Zero cost. Full functionality."*
