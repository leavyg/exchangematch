"""Collect self-hosted fonts (from unpacked @fontsource packages) into <site>/fonts plus fonts.css."""
import sys, os, re, shutil
pkgroot, site = sys.argv[1], sys.argv[2]
want = {"schibsted-grotesk":[400,500,600,700,800]}
os.makedirs(os.path.join(site,"fonts"), exist_ok=True)
css=[]
for pkg in os.listdir(pkgroot):
    fam = next((f for f in want if pkg.startswith("fontsource-"+f+"-")), None)
    if not fam: continue
    base = os.path.join(pkgroot,pkg,"package")
    for w in want[fam]:
        for block in re.findall(r"@font-face\s*\{.*?\}", open(os.path.join(base,f"{w}.css")).read(), re.S):
            m = re.search(r"/\*\s*([a-z0-9-]+)\s*\*/", block)  # not always present; detect subset from filename instead
            f = re.search(r"url\(\./files/([^)]+?\.woff2)\)", block)
            if not f: continue
            fname = f.group(1)
            if not re.search(r"-(latin|latin-ext)-\d+-normal\.woff2$", fname): continue
            shutil.copyfile(os.path.join(base,"files",fname), os.path.join(site,"fonts",fname))
            block = re.sub(r"src:[^;]+;", f"src:url(fonts/{fname}) format('woff2');", block)
            css.append(re.sub(r"\s+"," ",block))
open(os.path.join(site,"fonts.css"),"w").write("\n".join(css)+"\n")
print(len(css),"font faces;", sum(os.path.getsize(os.path.join(site,"fonts",x)) for x in os.listdir(os.path.join(site,"fonts")))//1024,"KB")
