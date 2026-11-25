#!/bin/bash
# Mix della scena dello spioncino: voce + suoni veri CC0 (ascensore che si ferma, campanello del piano, tre colpi, battito, ambiente, crescendo).
# Uso: mix.sh <video muto> <uscita.mp4>   (serve audio/vo.wav, la voce di scripts/bivio/voce.py rallentata a 3 parole al secondo)
# I suoni sono in scripts/bivio/sfx (licenze in licenze_suoni.json); LIB=<cartella> per prenderli altrove.
set -e
D="$(cd "$(dirname "$0")" && pwd)"; LIB="${LIB:-$D/../../sfx}"; [ -d "$LIB" ] || LIB=/home/user/HiggsfieldDev/scripts/bivio/sfx; SFX="$LIB"
K1=6.63; K2=7.04; K3=7.44          # inizio dei tre tagli: il colpo cade 0,02-0,03 s dopo (film: 6,66 / 7,06 / 7,46)
ffmpeg -v error -y -i "$D/audio/vo.wav" -ss 23.65 -t 4.75 -i "$SFX/ascensore.mp3" -i "$SFX/ascensore_ding.mp3" -i "$SFX/bussata.mp3" \
  -t 14.2 -i "$LIB/heart60.mp3" -ss 6 -t 19 -i "$LIB/amb_slow.mp3" -i "$LIB/riser.mp3" -i "$LIB/colpo.mp3" -filter_complex "
[0:a]aresample=48000,aformat=channel_layouts=stereo[vo];
[1:a]aresample=48000,lowpass=f=2600,afade=t=in:st=0:d=1.6,afade=t=out:st=4.3:d=0.45,volume=2.4,aformat=channel_layouts=stereo[asc];
[2:a]aresample=48000,lowpass=f=3800,volume=0.4,adelay=4080:all=1,aformat=channel_layouts=stereo[ding];
[3:a]aresample=48000,asplit=3[b1][b2][b3];
[b1]atrim=0.97:1.27,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.004,afade=t=out:st=0.25:d=0.05,volume=2.5[k1];
[b2]atrim=1.27:1.57,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.004,afade=t=out:st=0.25:d=0.05,volume=2.7[k2];
[b3]atrim=1.57:2.02,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.004,afade=t=out:st=0.38:d=0.07,volume=1.25[k3];
[k1]adelay=$(echo "$K1*1000/1" | bc):all=1[k1d];[k2]adelay=$(echo "$K2*1000/1" | bc):all=1[k2d];[k3]adelay=$(echo "$K3*1000/1" | bc):all=1[k3d];
[k1d][k2d][k3d]amix=inputs=3:normalize=0,equalizer=f=110:t=q:w=0.9:g=6,aecho=0.85:0.5:38|82:0.22|0.12,aformat=channel_layouts=stereo[knock];
[4:a]aresample=48000,atempo=1.15,afade=t=in:st=0:d=0.8,volume='0.42+0.2*min(1,t/6)':eval=frame,adelay=7950:all=1,aformat=channel_layouts=stereo[heart];
[5:a]aresample=48000,afade=t=in:st=0:d=1.5,volume=0.16,aformat=channel_layouts=stereo[amb];
[6:a]aresample=48000,volume=0.3,adelay=12300:all=1,aformat=channel_layouts=stereo[rise];
[7:a]aresample=48000,volume=0.5,aecho=0.8:0.6:120|260:0.3|0.18,adelay=16080:all=1,aformat=channel_layouts=stereo[hit];
[vo][asc][ding][knock][heart][amb][rise][hit]amix=inputs=8:normalize=0:duration=longest,atrim=0:18.7,afade=t=out:st=17.7:d=1.0,loudnorm=I=-14:TP=-1:LRA=11,aresample=48000[a]" \
  -map "[a]" -c:a pcm_s16le "$D/audio/mix.wav"
[ -n "$1" ] && ffmpeg -v error -y -i "$1" -i "$D/audio/mix.wav" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -movflags +faststart -shortest "$2"
echo fatto
