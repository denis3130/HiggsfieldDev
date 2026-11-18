import subprocess
from datetime import date, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

from clipper import dedupe, render, rights
from clipper.models import Source
from clipper.youtube_upload import next_slots

RIGHTS = {
    "own_channels": ["UCmine"],
    "youtube_licenses_allowed": ["creativeCommon"],
    "creators": [
        {"name": "Blur", "platforms": {"twitch": "blur"}, "status": "pending", "proof": ""},
        {"name": "Ok", "platforms": {"twitch": "okstreamer"}, "status": "granted", "proof": "email", "expires": ""},
        {"name": "Old", "platforms": {"twitch": "old"}, "status": "granted", "proof": "email", "expires": "2020-01-01"},
    ],
}


def src(**kw):
    base = dict(platform="twitch_clip", source_id="x", url="u", title="t", creator="c", creator_handle="h")
    base.update(kw)
    return Source(**base)


def test_rights_blocks_twitch_without_permission():
    ok, why = rights.check(RIGHTS, src(creator_handle="blur", creator="Blur"))
    assert not ok


def test_rights_allows_granted_and_cc_and_own():
    assert rights.check(RIGHTS, src(creator_handle="okstreamer"))[0]
    assert rights.check(RIGHTS, src(platform="youtube", license="creativeCommon"))[0]
    assert rights.check(RIGHTS, src(platform="youtube", creator_handle="UCmine"))[0]
    assert not rights.check(RIGHTS, src(platform="youtube", license="youtube"))[0]


def test_rights_expired_permission():
    assert not rights.check(RIGHTS, src(creator_handle="old"), today=date(2026, 11, 18))[0]


def test_keep_intervals_and_remap():
    keep = render.keep_intervals(20.0, [(5.0, 8.0), (12.0, 12.3)])
    assert keep == [(0.0, 5.15), (7.85, 20.0)]
    assert render.remap(2.0, keep) == 2.0
    assert render.remap(6.0, keep) is None
    assert render.remap(10.0, keep) == pytest.approx(5.15 + 2.15)


def test_dedupe_overlap_and_hash():
    pub = [{"source_key": "a", "segment": [10, 40], "phash": ["ffff000000000000"] * 6, "title": "GTA 6 inseguimento folle"}]
    assert dedupe.is_duplicate(pub, "a", (20, 50))
    assert dedupe.is_duplicate(pub, "b", (0, 30)) is None
    assert dedupe.is_duplicate(pub, "b", (0, 30), hashes=["ffff000000000001"] * 6)
    assert dedupe.is_duplicate(pub, "b", (0, 30), title="GTA 6 inseguimento folle!")


def test_slots_respect_daily_quota():
    cfg = {"selection": {"shorts_per_day": 3},
           "upload": {"timezone": "Europe/Rome", "publish_slots": ["12:30", "15:30", "18:30", "21:00"]}}
    now = datetime(2026, 11, 18, 13, 0, tzinfo=ZoneInfo("Europe/Rome"))
    s = next_slots(cfg, set(), 4, now=now)
    assert s[0] == "2026-11-18T14:30:00Z"      # 15:30 Roma
    assert s[2] == "2026-11-19T11:30:00Z"      # oggi solo 2 slot rimasti, poi domani 12:30
    assert len(set(s)) == 4


@pytest.mark.skipif(subprocess.run(["which", "ffmpeg"], capture_output=True).returncode != 0, reason="ffmpeg")
def test_render_vertical(tmp_path: Path):
    from clipper.media import probe_duration
    src_v = tmp_path / "in.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "lavfi", "-i", "testsrc2=size=1280x720:rate=30:duration=20",
                    "-f", "lavfi", "-i", "sine=frequency=440:duration=20", "-af", "volume='if(between(t,6,9),0,1)':eval=frame",
                    "-c:v", "libx264", "-c:a", "aac", "-shortest", str(src_v)], check=True)
    cut, keep = render.dynamic_cut(src_v, 1, 19, tmp_path / "cut.mp4", min_len=10)
    assert len(keep) == 2 and probe_duration(cut) < 17.5
    ass = render.build_ass(tmp_path / "s.ass", [{"start": 0.5, "end": 2, "text": "Ciao a tutti!"}], "Guarda qui",
                           [{"start": 3, "end": 5, "text": "Commento"}], "Fonte: test", probe_duration(cut))
    out = render.render_vertical(cut, ass, tmp_path / "out.mp4", [2.0, 6.0], {"render": {"width": 1080, "height": 1920, "fps": 30}})
    info = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                           "-of", "csv=p=0", str(out)], capture_output=True, text=True).stdout.strip()
    assert info == "1080,1920"
