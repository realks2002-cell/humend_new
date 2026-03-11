#!/usr/bin/env python3
"""각 이미지의 텍스트/콘텐츠 영역을 스캔하여 좌표 정보 출력"""

from PIL import Image
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'docs', 'screenshots')

def scan_text_regions(filename):
    path = os.path.join(BASE, filename)
    if not os.path.exists(path):
        print(f"\n=== {filename}: NOT FOUND ===")
        return

    img = Image.open(path).convert('RGB')
    w, h = img.size
    pixels = img.load()

    print(f"\n=== {filename} ({w}x{h}) ===")

    # Scan every 3 pixels vertically, find dark text pixels (< 100 in all channels)
    for y in range(0, h, 3):
        dark_xs = []
        for x in range(0, w, 1):
            r, g, b = pixels[x, y]
            if r < 120 and g < 120 and b < 120:
                dark_xs.append(x)
        if len(dark_xs) > 5:
            print(f"  y={y}: x={dark_xs[0]}-{dark_xs[-1]} ({len(dark_xs)}px)")

targets = [
    'member-resume-desktop.png',
    'member-resume-mobile.png',
    'member-mypage-desktop.png',
    'member-mypage-mobile.png',
    'member-salary-desktop.png',
    'member-salary-mobile.png',
    'member-consent-desktop.png',
    'admin-members-desktop.png',
    'admin-settings-desktop.png',
    'admin-partners-desktop.png',
    'admin-applications-desktop.png',
    'admin-payroll-desktop.png',
    'admin-payments-desktop.png',
    'admin-contracts-desktop.png',
    'admin-notifications-desktop.png',
]

for t in targets:
    scan_text_regions(t)
