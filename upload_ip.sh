IP_ADDRESS=$(hostname -I | awk '{print $1}')
cd /home/student334/CPSC334/RaspberryPi
echo "Current Raspberry Pi IP: $IP_ADDRESS" > ip.md
git config --global user.email xinranli5982@gmail.com
git config --global user.name TracyL5982
git add ip.md
git commit -m "Updated IP address to $IP_ADDRESS on $(date)"
git push origin main