sudo fuser -k 8000/tcp

cd /home/student334/installation/CPSC334/P3/p5_project

python3 server.py &

python3 -m http.server 8000 &

if [ -z "$DISPLAY" ]; then
  export DISPLAY=:0
fi

exec chromium-browser --kiosk --incognito --disable-restore-session-state --enable-logging=stderr --v=1 http://localhost:8000
