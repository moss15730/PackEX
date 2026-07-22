/** Canvas burn-in for packing evidence (drawn into the recorded stream). */

export type OverlayLines = {
  orderNo: string;
  stationCode: string;
  employeeName: string;
  tenantSlug: string;
  timezone: string;
  recording: boolean;
};

export function formatOverlayClock(timezone: string) {
  try {
    return new Date().toLocaleString("th-TH", {
      timeZone: timezone || "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return new Date().toISOString();
  }
}

export function paintBurnIn(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  lines: OverlayLines,
) {
  const pad = Math.max(10, Math.round(width * 0.012));
  const fontMain = Math.max(14, Math.round(width * 0.022));
  const fontSub = Math.max(12, Math.round(width * 0.016));
  const boxH = fontMain + fontSub * 2 + pad * 2.4;

  ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
  ctx.fillRect(0, height - boxH, width, boxH);

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";
  ctx.font = `700 ${fontMain}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  ctx.fillText(lines.orderNo, pad, height - boxH + pad);

  ctx.font = `500 ${fontSub}px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
  ctx.fillText(
    `${lines.stationCode} · ${lines.employeeName} · ${lines.tenantSlug}`,
    pad,
    height - boxH + pad + fontMain + 4,
  );
  ctx.fillText(
    `${formatOverlayClock(lines.timezone)}${lines.recording ? " · ● REC" : ""}`,
    pad,
    height - boxH + pad + fontMain + fontSub + 8,
  );

  if (lines.recording) {
    const badge = "REC";
    ctx.font = `700 ${fontSub}px ui-sans-serif, system-ui, sans-serif`;
    const tw = ctx.measureText(badge).width;
    const bx = width - pad - tw - 16;
    const by = pad;
    const bh = fontSub + 10;
    const bw = tw + 16;
    ctx.fillStyle = "rgba(220, 38, 38, 0.92)";
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#fff";
    ctx.fillText(badge, bx + 8, by + 5);
  }
}
