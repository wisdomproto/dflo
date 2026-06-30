# -*- coding: utf-8 -*-
"""KO 마스터 + i18n_work/{lang}.json → dist/{lang}/index.html 생성."""
import re, json, html as H, os, sys
HERE=os.path.dirname(os.path.abspath(__file__)); ROOT=os.path.dirname(HERE)
KO=open(os.path.join(ROOT,"dist","ko","index.html"),encoding="utf-8").read()

FIT_SCRIPT = ("<script>(function(){function fit(el){var fs=parseFloat(getComputedStyle(el).fontSize);"
  "var min=fs*0.5,g=80;while((el.scrollHeight>el.clientHeight+1||el.scrollWidth>el.clientWidth+1)&&fs>min&&g-->0){fs-=0.5;el.style.fontSize=fs+'px';}}"
  "function run(){var ls=document.querySelectorAll('.blk');for(var i=0;i<ls.length;i++)fit(ls[i]);}"
  "if(document.readyState!=='loading')run();else document.addEventListener('DOMContentLoaded',run);"
  "if(document.fonts&&document.fonts.ready)document.fonts.ready.then(run);"
  "})();</script>")
FONT={
 "en":"'Noto Sans','Noto Sans KR', sans-serif",
 "cn":"'Noto Sans SC','Noto Sans KR', sans-serif",
 "tw":"'Noto Sans TC','Noto Sans KR', sans-serif",
 "th":"'Noto Sans Thai','Noto Sans KR', sans-serif",
 "vi":"'Noto Sans','Noto Sans KR', sans-serif",
}
# 특수블록(p05 라벨:값, p23/25/27 전/후) 번역
SPECIAL={
 "en":{"병원명":"Hospital Name","설립일":"Established","대표원장":"Director","직원 수":"Staff","주소":"Address",
  "연세새봄의원":"Yonsei Saebom Medical Clinic","2010년 10월 5일":"October 5, 2010","채용현":"Yong-Hyun Chae",
  "18명 (2023년 1월 기준)":"18 (as of Jan 2023)","서울특별시 강남구 도산대로 328, 2~3층":"2F & 3F, 328 Dosan-daero, Gangnam-gu, Seoul",
  "치료 전":"Before","치료 3년 5개월 후":"After 3 yrs 5 mo","치료 3년 후":"After 3 years","치료 2년 후":"After 2 years"},
 "cn":{"병원명":"医院名称","설립일":"成立日期","대표원장":"院长","직원 수":"员工人数","주소":"地址",
  "연세새봄의원":"Yonsei Saebom Medical Clinic","2010년 10월 5일":"2010年10月5日","채용현":"Yong-Hyun Chae",
  "18명 (2023년 1월 기준)":"18人（截至2023年1月）","서울특별시 강남구 도산대로 328, 2~3층":"首尔市江南区岛山大路328号，2-3层",
  "치료 전":"治疗前","치료 3년 5개월 후":"治疗3年5个月后","치료 3년 후":"治疗3年后","치료 2년 후":"治疗2年后"},
 "tw":{"병원명":"醫院名稱","설립일":"成立日期","대표원장":"院長","직원 수":"員工人數","주소":"地址",
  "연세새봄의원":"Yonsei Saebom Medical Clinic","2010년 10월 5일":"2010年10月5日","채용현":"Yong-Hyun Chae",
  "18명 (2023년 1월 기준)":"18人（截至2023年1月）","서울특별시 강남구 도산대로 328, 2~3층":"首爾市江南區島山大路328號，2-3樓",
  "치료 전":"治療前","치료 3년 5개월 후":"治療3年5個月後","치료 3년 후":"治療3年後","치료 2년 후":"治療2年後"},
 "th":{"병원명":"ชื่อโรงพยาบาล","설립일":"ก่อตั้งเมื่อ","대표원장":"ผู้อำนวยการ","직원 수":"จำนวนพนักงาน","주소":"ที่อยู่",
  "연세새봄의원":"Yonsei Saebom Medical Clinic","2010년 10월 5일":"5 ตุลาคม 2010","채용현":"Yong-Hyun Chae",
  "18명 (2023년 1월 기준)":"18 คน (ณ มกราคม 2023)","서울특별시 강남구 도산대로 328, 2~3층":"ชั้น 2-3, 328 Dosan-daero, Gangnam-gu, Seoul",
  "치료 전":"ก่อนรักษา","치료 3년 5개월 후":"หลังรักษา 3 ปี 5 เดือน","치료 3년 후":"หลังรักษา 3 ปี","치료 2년 후":"หลังรักษา 2 ปี"},
 "vi":{"병원명":"Tên phòng khám","설립일":"Ngày thành lập","대표원장":"Giám đốc","직원 수":"Số nhân viên","주소":"Địa chỉ",
  "연세새봄의원":"Yonsei Saebom Medical Clinic","2010년 10월 5일":"05/10/2010","채용현":"Yong-Hyun Chae",
  "18명 (2023년 1월 기준)":"18 người (tính đến 01/2023)","서울특별시 강남구 도산대로 328, 2~3층":"Tầng 2-3, 328 Dosan-daero, Gangnam-gu, Seoul",
  "치료 전":"Trước điều trị","치료 3년 5개월 후":"Sau 3 năm 5 tháng","치료 3년 후":"Sau 3 năm","치료 2년 후":"Sau 2 năm"},
}
SPECIAL_IDS={"p05_b02","p05_b04","p05_b06","p05_b08","p05_b10","p23_b04","p23_b05","p25_b04","p25_b05","p27_b00","p27_b01"}

def esc(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")

def rebuild_special(bid, inner, sm):
    if bid.startswith("p05"):
        m=re.match(r'^(?P<lbl>.*?) :&nbsp;&nbsp;<span(?P<sp>[^>]*)>(?P<val>.*?)</span>$', inner, re.S)
        if not m: return inner
        lbl=H.unescape(m.group("lbl")).strip(); val=H.unescape(m.group("val")).strip()
        return f'{esc(sm.get(lbl,lbl))} :&nbsp;&nbsp;<span{m.group("sp")}>{esc(sm.get(val,val))}</span>'
    else:  # 전/후 캡션
        parts=re.findall(r'<span>(.*?)</span>', inner, re.S)
        if len(parts)!=2: return inner
        a,b=[H.unescape(p).strip() for p in parts]
        return f'<span>{esc(sm.get(a,a))}</span><span>{esc(sm.get(b,b))}</span>'

def gen(lang):
    trans=json.load(open(os.path.join(HERE,f"{lang}.json"),encoding="utf-8"))
    sm=SPECIAL[lang]
    html=KO.replace('<html lang="ko">', f'<html lang="{lang}">')
    def repl(m):
        bid=m.group("id"); style=m.group("style"); inner=m.group("inner")
        if bid in trans:
            ninner=esc(str(trans[bid]))
            if bid=="p06_b01":
                for nm in ("Yong-Hyun Chae","ยงฮยอน"):
                    ninner=ninner.replace(nm, f'<span style="white-space:nowrap">{nm}</span>')
        elif bid in SPECIAL_IDS: ninner=rebuild_special(bid, inner, sm)
        else: ninner=inner
        return f'<div class="blk" data-id="{bid}" style="{style}">{ninner}</div>'
    html=re.sub(r'<div class="blk" data-id="(?P<id>[^"]+)" style="(?P<style>[^"]*)">(?P<inner>.*?)</div>', repl, html, flags=re.S)
    html=html.replace("font-family:'Noto Sans KR', sans-serif", f"font-family:{FONT[lang]}")
    html=html.replace('</body>', FIT_SCRIPT+'</body>')
    out=os.path.join(ROOT,"dist",lang); os.makedirs(out,exist_ok=True)
    open(os.path.join(out,"index.html"),encoding="utf-8",mode="w").write(html)
    # 커버리지
    miss=[b for b in trans if b not in html]  # 단순 카운트용
    return len(trans)

if __name__=="__main__":
    for lang in (sys.argv[1:] or ["en","cn","tw","th","vi"]):
        if os.path.exists(os.path.join(HERE,f"{lang}.json")):
            n=gen(lang); print(f"{lang}: {n} 번역 주입 → dist/{lang}/index.html")
        else:
            print(f"{lang}: {lang}.json 없음 (에이전트 대기)")
