@echo off
cd /d %~dp0
python collector.py --mode full --max-pages 10
pause
