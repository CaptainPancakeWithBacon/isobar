#!/usr/bin/env bash
# Average GPU busy %, battery power and gnome-shell CPU over N seconds, sampled once a second.
# Read only: it reads sysfs and /proc and changes nothing. Run it on battery, with the same
# brightness, power profile and windows each time, and compare the numbers between runs.
# Usage: tools/measure.sh [seconds] [label]
set -euo pipefail

SECS=${1:-120}
LABEL=${2:-run}

GPU_DIR=$(dirname "$(grep -l 0x1002 /sys/class/drm/card*/device/vendor | head -1)")
BAT=$(ls -d /sys/class/power_supply/BAT* | head -1)
PID=$(pgrep -x gnome-shell | head -1)

power_w() {
    if [ -r "$BAT/power_now" ]; then
        awk '{printf "%.3f", $1 / 1e6}' "$BAT/power_now"
    else
        awk -v v="$(cat "$BAT/voltage_now")" -v c="$(cat "$BAT/current_now")" 'BEGIN {printf "%.3f", v * c / 1e12}'
    fi
}
cpu_ticks() { awk '{print $14 + $15}' "/proc/$PID/stat"; }

[ "$(cat "$BAT/status")" = "Discharging" ] || echo "warning: not discharging, the power number will be meaningless" >&2

gpu_sum=0; pow_sum=0; cpu0=$(cpu_ticks)
for _ in $(seq "$SECS"); do
    gpu_sum=$((gpu_sum + $(cat "$GPU_DIR/gpu_busy_percent")))
    pow_sum=$(awk -v a="$pow_sum" -v b="$(power_w)" 'BEGIN {print a + b}')
    sleep 1
done
cpu1=$(cpu_ticks)

awk -v l="$LABEL" -v n="$SECS" -v g="$gpu_sum" -v p="$pow_sum" -v c0="$cpu0" -v c1="$cpu1" \
    'BEGIN {printf "%-22s GPU busy %5.1f %%   battery %5.2f W   gnome-shell CPU %5.1f %% of one core\n", l, g / n, p / n, (c1 - c0) / 100 / n * 100}'
