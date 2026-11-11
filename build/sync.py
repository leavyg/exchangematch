"""Build data.json for the student app from the register export (one JSON file per record)
plus any record sets the register doesn't hold yet (fallback files)."""
import json, glob, sys, os, collections, datetime
reg_dir, out = sys.argv[1], sys.argv[2]
fallbacks = sys.argv[3:]
def unwrap(d):
    # the register may wrap a document; accept either the bare record or {data:{...}}
    if isinstance(d, dict) and 'pathways' not in d and isinstance(d.get('data'), dict): d = d['data']
    return d
reg = [unwrap(json.load(open(f))) for f in sorted(glob.glob(os.path.join(reg_dir, '*.json')))]
reg = [r for r in reg if isinstance(r, dict) and r.get('pathways') and r.get('view')]
have = {r['id'] for r in reg}
views_in_reg = {r['view'] for r in reg}
extra = []
for fb in fallbacks:
    for r in json.load(open(fb)):
        if r['id'] not in have and r['view'] not in views_in_reg: extra.append(r)
records = reg + extra
# Student wording: short facts / "Research further." / nothing (register keeps the full wording)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wording import student_wording
student_wording(records)
c = collections.Counter((r['view'], (r.get('signOff') or {}).get('status')) for r in records)
meta = {"cycle":"2027-28","synced":datetime.date.today().isoformat(),
        "fromRegister":len(reg),"fromFallback":len(extra),"signOff":{f"{v}:{s}":n for (v,s),n in c.items()}}
json.dump({"meta":meta,"records":records}, open(out,'w'), ensure_ascii=False, separators=(',',':'))
print(json.dumps(meta, indent=1))
