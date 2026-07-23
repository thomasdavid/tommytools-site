@echo off
cd /d %~dp0
python collector.py --mode incremental --max-pages 2 >> output\daily.log 2>&1
