# router-config/

OpenWrt router configuration files for deploying the Department Guide System.
These files are copied to specific locations on the router.

## Files & Deployment Locations

| File | Router Location | Purpose |
|---|---|---|
| `captive_check.py` | `/root/captive_check.py` | Flask captive portal on port 80 |
| `webapp.init` | `/etc/init.d/webapp` | procd service — auto-starts Flask app |
| `captive.init` | `/etc/init.d/captive` | procd service — auto-starts captive portal |
| `rc.local` | `/etc/rc.local` | iptables rules on every boot |
| `rc.button.reset` | `/etc/rc.button/reset` | Reset button behavior override |
| `dnsmasq.conf` | `/etc/dnsmasq.conf` | DNS interception for captive portal |

## Captive Portal Supported Devices

| Brand | Detection URL | Status |
|---|---|---|
| Samsung | connectivitycheck.gstatic.com | ✓ |
| Xiaomi/Redmi | connect.rom.miui.com | ✓ |
| Vivo | wifi.vivo.com.cn | ✓ |
| Oppo/Realme | wifi.oppo.com | ✓ |
| Poco | connectivitycheck.android.com | ✓ |
| iPhone | captive.apple.com | ✓ |
| Windows | www.msftconnecttest.com | ✓ |
| Linux | nmcheck.gnome.org | ✓ |

## Deploy Commands

```bash
# Copy all config files to router
scp -O captive_check.py root@192.168.1.1:/root/
scp -O webapp.init root@192.168.1.1:/etc/init.d/webapp
scp -O captive.init root@192.168.1.1:/etc/init.d/captive
scp -O rc.local root@192.168.1.1:/etc/rc.local
scp -O rc.button.reset root@192.168.1.1:/etc/rc.button/reset
scp -O dnsmasq.conf root@192.168.1.1:/etc/dnsmasq.conf

# Enable services
ssh root@192.168.1.1 "chmod +x /etc/init.d/webapp /etc/init.d/captive /etc/rc.button/reset"
ssh root@192.168.1.1 "/etc/init.d/webapp enable && /etc/init.d/captive enable"
ssh root@192.168.1.1 "/etc/init.d/dnsmasq restart"
```
