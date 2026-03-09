#!/usr/bin/env python3
"""스크린샷 개인정보 블러 처리 스크립트
좌표는 원본 이미지 기준 (pixel scan 기반)"""

from PIL import Image, ImageFilter, ImageDraw
import os

BASE = os.path.join(os.path.dirname(__file__), '..', 'docs', 'screenshots')
BLUR_RADIUS = 30


def blur_regions(filename, regions):
    path = os.path.join(BASE, filename)
    if not os.path.exists(path):
        print(f"  SKIP (not found): {filename}")
        return
    img = Image.open(path)
    w, h = img.size
    count = 0
    for label, (x1, y1, x2, y2) in regions:
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w, x2), min(h, y2)
        if x2 <= x1 or y2 <= y1:
            continue
        region = img.crop((x1, y1, x2, y2))
        # 2단계 블러: 먼저 크게, 다시 크게 (텍스트 완전 제거)
        blurred = region.filter(ImageFilter.GaussianBlur(radius=BLUR_RADIUS))
        blurred = blurred.filter(ImageFilter.GaussianBlur(radius=BLUR_RADIUS))
        img.paste(blurred, (x1, y1))
        count += 1
    img.save(path)
    print(f"  OK: {filename} ({w}x{h}) - {count} regions blurred")


# ============================================================
# 회원 페이지
# ============================================================

print("=== 회원 페이지 ===")

# member-resume-desktop.png (1425x2289)
# Pixel scan으로 확인한 좌표:
# - 프로필 사진: x=674-765, y=171-276
# - 이름/전화번호 labels: y=438-447 (블러 안함)
# - 이름 input value: y≈468-488, x≈430-570
# - 전화번호 input value: y≈468-488, x≈700-840
# - 생년월일: y≈540-555
# - 이메일: y≈618-630
# - 거주지역/키: y≈690-705
# - 주민번호: y≈948-975
# - 예금주: y≈1505-1525
# - 계좌번호: y≈1580-1615
blur_regions('member-resume-desktop.png', [
    ("프로필 사진",       (650, 150, 790, 295)),
    ("이름 input",       (420, 455, 685, 502)),
    ("전화번호 input",   (690, 455, 1015, 502)),
    ("생년월일 input",   (420, 528, 685, 572)),
    ("이메일 input",     (420, 602, 1015, 648)),
    ("거주지역 input",   (420, 678, 685, 722)),
    ("키 input",         (690, 678, 870, 722)),
    ("주민번호 inputs",  (420, 885, 870, 920)),
    ("예금주 input",     (420, 1496, 685, 1542)),
    ("계좌번호 input",   (420, 1568, 810, 1622)),
])

# member-resume-mobile.png (375x2349)
# 모바일: 같은 y좌표, x는 0-375 범위로 축소
# scan: labels y=438, inputs y≈468-488 등 동일 패턴
blur_regions('member-resume-mobile.png', [
    ("프로필 사진",       (140, 150, 250, 295)),
    ("이름 input",       (25, 455, 175, 502)),
    ("전화번호 input",   (180, 455, 360, 502)),
    ("생년월일 input",   (25, 528, 175, 572)),
    ("이메일 input",     (25, 602, 360, 648)),
    ("거주지역 input",   (25, 678, 175, 722)),
    ("키 input",         (180, 678, 275, 722)),
    ("주민번호 inputs",  (25, 885, 275, 920)),
    ("예금주 input",     (25, 1510, 200, 1550)),
    ("계좌번호 input",   (25, 1585, 260, 1630)),
])

# member-mypage-desktop.png (1425x1063)
# scan: welcome text at y=132-147, x=387-678
# 프로필 사진: y=123-192, x=290-380 (rounded image)
blur_regions('member-mypage-desktop.png', [
    ("프로필 사진",       (280, 95, 380, 215)),
    ("이강석님 텍스트",   (375, 115, 545, 162)),
])

# member-mypage-mobile.png (375x1278)
# 모바일 welcome card - 더 작은 크기
blur_regions('member-mypage-mobile.png', [
    ("프로필 사진",       (28, 82, 120, 188)),
    ("이강석님 텍스트",   (125, 95, 270, 140)),
])

# member-salary-desktop.png (1425x1063)
# scan: account line "하나은행 1977-... 이강석" at y=243-252, x=391-624
blur_regions('member-salary-desktop.png', [
    ("계좌+예금주 라인",  (385, 232, 650, 262)),
])

# member-salary-mobile.png (375x1051)
# 모바일 계좌 정보 라인
blur_regions('member-salary-mobile.png', [
    ("계좌+예금주 라인",  (52, 232, 310, 262)),
])

# member-consent-desktop.png (1265x1276) - untracked
# 친권자 동의서: 테이블 내 개인정보 값(value) 영역만 블러
# 테이블 구조: label(x≈268-370) | value(x≈370~)
# 섹션1 헤더: y≈240-270, 섹션2 헤더: y≈440-470
# 데이터 행: 성명(~348), 연락처(348-393), 관계(393-438),
#            성명(~564), 생년월일(564-609), 연락처(609-654)
blur_regions('member-consent-desktop.png', [
    ("친권자 성명",       (365, 295, 550, 342)),
    ("친권자 연락처",     (365, 353, 550, 388)),
    ("연소근로자 성명",   (365, 510, 550, 558)),
    ("연소근로자 생년월일", (365, 572, 580, 602)),
    ("연소근로자 연락처", (365, 617, 580, 648)),
    ("동의문 내 이름들",  (240, 665, 660, 785)),
    ("보호자 성명 값",    (365, 786, 440, 812)),
    ("서명 이미지",       (268, 825, 785, 930)),
])


# ============================================================
# 관리자 페이지
# ============================================================

print("\n=== 관리자 페이지 ===")

# admin-members-desktop.png (1425x1393)
# 테이블: 이름, 전화번호, 지역, 상태, 가입일
# scan: header y≈240, data rows y≈258-680
# 이름 col: x≈335-548, 전화번호 col: x≈548-770
blur_regions('admin-members-desktop.png', [
    ("이름 컬럼",     (330, 255, 560, 1200)),
    ("전화번호 컬럼", (560, 255, 780, 1200)),
])

# admin-settings-desktop.png (1425x1063)
# 3개 admin 행: 아이디+이름 블러
# scan: header y≈215, data y≈240-370
blur_regions('admin-settings-desktop.png', [
    ("아이디 컬럼",  (330, 240, 540, 378)),
    ("이름 컬럼",    (540, 240, 710, 378)),
])

# admin-partners-desktop.png (1265x1145) - untracked
# 1행: 담당자, 연락처, 이메일
blur_regions('admin-partners-desktop.png', [
    ("담당자",   (252, 195, 348, 242)),
    ("연락처",   (348, 195, 485, 242)),
    ("이메일",   (485, 195, 660, 242)),
])

# admin-applications-desktop.png (1425x1063)
# scan: header y≈216, 1 data row y≈255-280
# 이름 col: x≈470-595, 전화번호 col: x≈595-770
blur_regions('admin-applications-desktop.png', [
    ("이름 컬럼",     (468, 248, 600, 292)),
    ("전화번호 컬럼", (600, 248, 775, 292)),
])

# admin-payroll-desktop.png (1425x1183)
# 첫 열: 이름+전화번호+고객사 (복합 셀)
# scan: data starts y≈258, each ~45px, about 10 rows to y≈710
blur_regions('admin-payroll-desktop.png', [
    ("이름+전화번호 컬럼", (330, 254, 630, 1155)),
])

# admin-payments-desktop.png (1425x1917)
# 이름 컬럼 (첫 열, 링크 텍스트)
# scan: data starts y≈255, many rows to y≈1855
blur_regions('admin-payments-desktop.png', [
    ("이름 컬럼", (330, 252, 545, 1890)),
])

# admin-contracts-desktop.png (1425x2246)
# 이름 컬럼 (첫 열)
# scan: data starts y≈120, many rows to y≈2180
blur_regions('admin-contracts-desktop.png', [
    ("이름 컬럼", (330, 118, 510, 2050)),
])

# admin-notifications-desktop.png (1265x2756) - untracked
# 대상 컬럼 (이름 포함)
# 이전 실행 기반 + 조정: 사이드바 ~140, 테이블 시작
blur_regions('admin-notifications-desktop.png', [
    ("대상 컬럼", (138, 192, 265, 2680)),
])

print("\n완료!")
