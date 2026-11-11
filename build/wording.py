"""Student wording for the app.

The register keeps the full coordinator wording (with sources and reasoning). The student app
shows each line in one of three forms only: a short fact, "... Research further.", or nothing.
This runs at sync time (sync.py calls student_wording) so the rewrite survives every re-sync.

Run on its own: python3 -I build/wording.py data.json [report.txt]
"""
import re, json, sys

SUBJ = r"(Business|Economics|Political Science|Sociology)"
CITE = re.compile(r"\s*\((?:slides[^)]*|TBS[^)]*|\d{4} slides|\d{4} guide|Trinity Global ranking|partner pages only|"
                  r"page [A-Z][^)]*|partner page[^)]*|factsheet|TBS 2026-27 list|2026-27 list|2026-27|July 2026|"
                  r"named for[^)]*|Trinity row|2026-27 list said[^)]*|not read)\)", re.I)
RESEARCH = "Research further."

def tidy(s):
    s = CITE.sub("", s or "").strip()
    s = re.sub(r"^Business list 2026-27:\s*", "", s)
    s = re.sub(r"\s+", " ", s).strip(" ;–-")
    if s and s[-1] not in ".!?": s += "."
    return s[0].upper() + s[1:] if s else s

# Lines that only say where information came from, or that nothing was found: shown as nothing.
DROP = re.compile("|".join([
    r"^Some partners don't take Business or Economics",
    r"^Partner calendar: Not on partner page", r"^Partner calendar: Semester dates not on",
    r"^Partner pages not checked", r"^Agreement unconfirmed:", r"^Listed on the Sociology dept",
    r"^Business list 2026-27: Listed (as|under)", r"^Business list 2026-27: Berkeley",
    r"^Business list 2026-27: Listed as suitable", r"Go Global Guide", r"^No Trinity Global country page",
    r"^Stern exchange pages", r"page names no", r"^Partner page names no", r"blocked automated",
    r"navigation only", r"not (named|mentioned|checked|listed)( individually| on [^.]*| by discipline| as such)?[.;]?$",
    r"could not be fetched", r"^No (specific|general|exchange-specific) (course )?(rules|restrictions)",
    r"^Major-specific restrictions not published", r"^Whether Trinity's agreement", r"gives no course",
    r"^Course areas not listed", r"\(not read\)", r"^'?(a semester or a year|one or two semesters)",
    r"^One or (two|both) (semesters|terms)", r"^Minimum one semester, maximum two", r"^Semester exchange 'usually",
    r"^Single term, full year or split year", r"^Campus (record )?within the", r"^Faculty access for .* not stated",
    r"^Partner page gives no", r"^Course offerings change each semester; no subjects named",
    r"^English course list published each", r"^Departments approve each course; subjects not named",
    r"^Limits may apply", r"not named;", r"^Previous TJH exchange", r"^Course restrictions per NUS",
    r"^Accepting schools include", r"^Open schools include", r"^Arts & Letters and Keough", r"^Subjects incl\.",
]), re.I)

REWRITE = [  # exact-ish rewrites, checked before the generic tidy
    (r"^TBS: previous team advised limited Business modules; one semester recommended", "Limited Business modules. One semester recommended."),
    (r"^French business schools start early", "Semester starts early. Check the dates against your Trinity semester."),
    (r"^One UC application; UC assigns the campus", "One application covers all UC campuses, and UC assigns yours."),
    (r"^One application covers all UC campuses", None),
    (r"^UC places students by major availability", "UC assigns campuses by subject availability."),
    (r"^UCLA reciprocity students cannot take Business", "Exchange students can't take Business courses at UCLA."),
    (r"^Partner page allows full year or spring; Trinity's 2026 slides say Hilary Term only", "Semester 2 only."),
    (r"^Partner page mentions exchanges 'longer than one term'", "Length unclear. " + RESEARCH),
    (r"^Full-year not stated", "Full year not confirmed. " + RESEARCH),
    (r"^Length of stay not stated; some units are full-year units", "Length not confirmed. " + RESEARCH),
    (r"^'one or two semesters' offered\. Available-units PDF", "Subject availability not confirmed. " + RESEARCH),
    (r"^Clinical programmes closed; subjects for BESS not named", "Clinical programmes closed."),
    (r"^Subjects not named on partner page", "Subjects not confirmed. " + RESEARCH),
    (r"^Economics, Political Science, Sociology, LeBow not mentioned", None),
    (r"^Women's college: female students only; Hilary Term only", "Women's college: female students only. Semester 2 only."),
    (r"^Hilary Term only(, due to Drexel's calendar)?", "Semester 2 only."),
    (r"^Hilary Term only; no full year", "Semester 2 only."),
    (r"^Chinese partners don't accept Chinese citizens", "Chinese citizens can't take part."),
    (r"^Business list 2026-27: Not good for Business; Econ/Pol/Soc can work if Business is front-loaded",
     "Not good for Business. Can work for Economics, Politics or Sociology if you take Business at Trinity first."),
    (r"^Business list 2026-27: Business major: one semester, minor at TCD", "Business major: one semester, with your minor at Trinity."),
]

RELEVANT = re.compile(r"Business|Econ|Politic|Sociolog|Social|Management|Finance|Accounting|Government|Public Affairs|Commerce|Wharton|Stern|Isenberg|Sauder", re.I)
CLOSURE = re.compile(r"closed|restricted|not available|unavailable|not typically open|only for students enrolled|separate Law School|except", re.I)

def rewrite_line(t):
    if CLOSURE.search(t) and not RELEVANT.search(t) and not re.search(r"exchange students|courses|subjects", t, re.I): return None
    if re.search(r"^(Units from any school except|Law )", t): return None
    for pat, rep in REWRITE:
        if re.search(pat, t, re.I): return rep
    if DROP.search(t): return None
    return tidy(t)

def comp_tier(t):
    m = re.match(r"^(Highly|Moderately|Least) competitive", t)
    return {"Highly":"High","Moderately":"Moderate","Least":"Low"}[m.group(1)] if m else None

# ----- pathway notes -----
JUSTIFY = re.compile(r"^(JH Business transcripts on record|endorsed by previous TBS|suitable per 2026-27 list)", re.I)
def condition_lines(note):
    """Turn a coordinator 'condition' note into short student lines."""
    out, minor = [], False
    s = note
    if re.match(r"^Endorsed by previous TBS Business team; no transcripts yet", s): return []
    m = re.match(r"^Trinity has no past transcripts for minor pathways here, so check with the coordinator that your (.+?) minor can be covered", s)
    if m: return [f"Your {m.group(1)} minor isn't confirmed here. {RESEARCH}"]
    s = re.sub(r"^Partner pages only – ", "", s)
    s = s.replace("Trinity hasn't confirmed suitability.", "")
    if "Minor subject not checked." in s: minor = True; s = s.replace("Minor subject not checked.", "")
    s = re.sub(r"Listed on stale \(Oct 2025\) Sociology non-EU page\.", "", s)
    s = re.sub(r"\(2026-27 list said not suitable; newer list used\.\)", "", s)
    tbs = re.search(r"TBS 2026-27: Econ/Pol/Soc can work if Business is front-loaded at TCD\.", s)
    if tbs: s = s.replace(tbs.group(0), "")
    parts = re.split(r"(?<![/\w])" + SUBJ + r": ", s)
    by_detail = {}
    for i in range(1, len(parts), 2):
        subj, body = parts[i], parts[i+1].strip().rstrip(".")
        if JUSTIFY.match(body): continue
        if re.match(r"2026-27 list – major one semester", body):
            out.append("Business: one semester only."); continue
        if body.startswith("no source found"):
            out.append(f"No information on {subj} courses yet. {RESEARCH}"); continue
        m = re.match(r"(no restriction found \(general access\)|open to exchange students|restricted/limited) – (.*)", body)
        if not m: out.append(tidy(f"{subj}: {body}")); continue
        d = m.group(2)
        d = CITE.sub("", d)
        d = re.sub(r"\s*\((not part of the business school|not Sociology as such|high demand)\)", "", d)
        d = re.sub(r"^Not named; ", "", d)
        d = re.sub(r"^Business/Economics: only 'must meet prerequisites'", "Open if you meet the prerequisites", d)
        d = re.sub(r"^(Business|Economics|Political Science|Sociology)( Administration)? named;\s*", "", d)
        d = re.sub(r";?\s*(Economics|Political Science|Sociology) not named( in the Trinity row)?", "", d)
        d = re.sub(r";\s*departments not named", "", d)
        d = re.sub(r"^'(.*)'$", r"\1", d.strip())
        d = d.strip(" ;.")
        if not d or re.match(r"^No faculty named as restricted$", d): d = "No restrictions listed by the partner"
        by_detail.setdefault(d, []).append(subj)
    for d, subs in by_detail.items():
        who = " and ".join(subs)
        d = d[0].upper() + d[1:]
        out.append(tidy(d if d.startswith(subs[0]) else f"{who}: {d}"))
    if tbs: out.append("Can work if you take your Business modules at Trinity first.")
    if minor: out.append(f"Your minor isn't confirmed here. {RESEARCH}")
    return out

def verified_lines(note):
    out = []
    m = re.search(r"Listed as 'Limited' for Business \(2026-27\): (.+)$", note)
    if m: out.append(tidy(m.group(1)))
    m = re.match(r"^2026-27 list: (.+)$", note)
    if m: out.append(tidy(m.group(1).replace("minor at TCD", "minor at Trinity")))
    if "Not at UCLA" in note: out.append("Not available at UCLA.")
    return out

CONDITION_REWRITE = [
    (r"^This is a (\w[\w ]*?) department exchange\. You'd mostly take \1 here and (?:do )?your (.+?) modules at Trinity in your other semester\..*$",
     lambda m: f"{m.group(1)} department exchange. Your {m.group(2)} modules are done at Trinity in your other semester."),
    (r"^This host only covers Economics minors\. You'd take Business here and finish your (.+?) minor at Trinity in your other semester\.$",
     lambda m: f"Only Economics minors are covered here. Your {m.group(1)} minor is done at Trinity in your other semester."),
    (r"^You take Business here and finish your minor at Trinity in your other semester\..*$",
     lambda m: "Business only here. Your minor is done at Trinity in your other semester, with your minor coordinator's approval."),
    (r"^Economics/Finance emphasis\. For Business students it's only suitable if you plan 2 Business modules without prerequisites in 4th year\..*$",
     lambda m: "Economics and Finance focus. Only suitable if you plan 2 Business modules without prerequisites in 4th year."),
    (r"^No econometrics here, so it's not suitable if you want the Economics capstone in 4th year\.$",
     lambda m: "No econometrics, so not suitable for the Economics capstone in 4th year."),
    (r"^The coordinator notes it's not suitable for Economics\.$", lambda m: "Not suitable for Economics, per the coordinator."),
    (r"^Only suitable if you plan to do your capstone in Business in 4th year\.$", lambda m: "Only suitable if your 4th-year capstone is in Business."),
]
def condition_text(t):
    for pat, f in CONDITION_REWRITE:
        m = re.match(pat, t)
        if m: return f(m)
    return tidy(t)

def student_wording(records, report=None):
    log = []
    def note(kind, before, after):
        if report is not None: log.append((kind, before, after))
    for r in records:
        facts = {}
        for p in (r.get("pathways") or {}).values():
            n = p.get("note") or ""
            conds = [condition_text(c) for c in (p.get("conditions") or [])]
            for a, b in zip(p.get("conditions") or [], conds): note("C", a, b)
            if p.get("status") == "condition":
                lines = condition_lines(n)
            elif p.get("status") == "verified":
                lines = verified_lines(n)
            else:
                lines = []
            note("P-" + str(p.get("status")), n, " | ".join(lines))
            if p.get("status") != "not": p["note"] = ""
            seen = set()
            p["conditions"] = [x for x in lines + conds if x and not (x in seen or seen.add(x))]
        keep = []
        for w in r.get("warnings") or []:
            t = rewrite_line(w["text"]); note("W", w["text"], t)
            if t: keep.append({**w, "text": t})
        r["warnings"] = keep
        keep = []
        warn_texts = {w["text"] for w in r["warnings"]}
        for x in r.get("notes") or []:
            t = x["text"]
            tier = comp_tier(t)
            if tier: facts["competition"] = tier; note("N", t, "[fact] Competition: " + tier); continue
            m = re.match(r"^Partner calendar: (.+)$", t)
            if m and not t.startswith("Partner calendar: Not on") and "not on exchange pages" not in t:
                facts["dates"] = tidy(m.group(1)).rstrip("."); note("N", t, "[fact] Dates: " + facts["dates"]); continue
            if t.startswith("Full year not confirmed"):
                nt = ("Full year not confirmed. " + RESEARCH) if "fy" in (r.get("terms") or []) else None
            else:
                nt = rewrite_line(t)
            note("N", t, nt)
            if nt: nt = re.sub(r"^≥", "At least ", nt)
            if nt and nt not in warn_texts: keep.append({**x, "text": nt})
        # one line per text; prefer the current-year version over an older one
        best = {}
        for x in keep:
            k = x["text"].lower()
            if k not in best or (best[k].get("stale") and not x.get("stale")): best[k] = x
        r["notes"] = [x for x in keep if best[x["text"].lower()] is x]
        r["facts"] = facts
    if report is not None:
        seen = set()
        with open(report, "w") as f:
            for k, a, b in log:
                if (k, a) in seen: continue
                seen.add((k, a)); f.write(f"[{k}] {a}\n   -> {b if b else '(nothing)'}\n")
    return records

if __name__ == "__main__":
    path = sys.argv[1]
    d = json.load(open(path))
    student_wording(d["records"], sys.argv[2] if len(sys.argv) > 2 else None)
    json.dump(d, open(path, "w"), ensure_ascii=False, separators=(",", ":"))
    print("reworded", len(d["records"]), "records")
