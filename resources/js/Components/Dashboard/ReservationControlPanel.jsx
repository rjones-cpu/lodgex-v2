import { useState } from 'react';

// Reservation Control Panel — redesigned right-hand panel for the Reservation
// Operations Center. The structure/visual language follows the shared
// ControlPanel reference (scoped CSS, collapsible sections, AI match ring).
// All data + actions are wired to the live Dashboard state via props so the
// existing behavior (approve, AI/manual assign, check-in/out, the expandable
// "Other" submenu) is preserved exactly.

const OTHER_ITEMS = [
    ['📍', 'Arrival', 'Arrival'],
    ['⏸️', 'Remove On-Hold', 'Remove On-Hold'],
    ['📅', 'Extend Stay', 'Extend Stay'],
    ['🚫', 'No-Show', 'Mark No-Show'],
    ['❌', 'Reject / Hold for Review', 'Reject / Hold for Review'],
    ['➕', 'New Reservation', 'New Reservation'],
    ['🧾', 'Add Notes', 'Add Notes'],
];

export default function ReservationControlPanel({
    selected,
    onAction,
    assignSaving = false,
    checkInSaving = false,
    otherOpen = false,
    onToggleOther,
    otherSectionRef,
}) {
    const [panelOpen, setPanelOpen] = useState(true);
    const [aiOpen, setAiOpen] = useState(true);
    const [actionsOpen, setActionsOpen] = useState(true);

    const isApproved = selected?.approval === 'Approved';
    const aiRoom = selected?.aiRoom || '—';
    const hasAiRoom = Boolean(selected?.aiRoom);

    return (
        <div className="sl-control-panel">
            <style>{styles}</style>

            <div className="sl-panel-card">
                <button
                    className="sl-panel-header"
                    type="button"
                    onClick={() => setPanelOpen((value) => !value)}
                    aria-expanded={panelOpen}
                >
                    <span className="sl-header-left">
                        <span className="sl-header-icon">
                            <SlidersIcon />
                        </span>
                        <span>Control Panel</span>
                    </span>
                    <ChevronIcon open={panelOpen} />
                </button>

                {panelOpen &&
                    (selected ? (
                        <div className="sl-panel-body">
                            <section className={`sl-reservation-card ${isApproved ? '' : 'is-pending'}`}>
                                <div className="sl-reservation-top">
                                    <div className="sl-avatar" style={{ background: selected.color }}>
                                        {selected.initials}
                                    </div>
                                    <div className="sl-reservation-id">
                                        <h3 title={selected.worker}>{selected.worker}</h3>
                                        <p className="sl-company-sub" title={selected.company}>
                                            {selected.company}
                                        </p>
                                        <span className="sl-status-pill">{selected.status}</span>
                                    </div>
                                </div>

                                <div className="sl-divider" />

                                <dl className="sl-detail-grid">
                                    <div>
                                        <dt>Stay Dates</dt>
                                        <dd>{`${selected.arrival} – ${selected.departure}`}</dd>
                                    </div>
                                    <div>
                                        <dt>Room Type</dt>
                                        <dd>{selected.roomType}</dd>
                                    </div>
                                    <div>
                                        <dt>Assigned</dt>
                                        <dd>{selected.room}</dd>
                                    </div>
                                    <div>
                                        <dt>AI Suggested Room</dt>
                                        <dd>{aiRoom}</dd>
                                    </div>
                                </dl>

                                <button
                                    type="button"
                                    className={`sl-approval-inline ${isApproved ? '' : 'is-pending'}`}
                                    onClick={() => onAction('Approve Reservation')}
                                >
                                    <span className="sl-check-icon">
                                        <CheckIcon />
                                    </span>
                                    <div>
                                        <strong>{isApproved ? 'Approved' : 'Approve'}</strong>
                                        <span>
                                            {isApproved
                                                ? 'This reservation is approved'
                                                : 'Tap to approve this reservation'}
                                        </span>
                                    </div>
                                </button>
                            </section>

                            <section className="sl-nested-card">
                                <button
                                    className="sl-section-header"
                                    type="button"
                                    onClick={() => setAiOpen((value) => !value)}
                                    aria-expanded={aiOpen}
                                >
                                    <span className="sl-section-title">
                                        <span className="sl-sparkle-blue">
                                            <SparkleIcon />
                                        </span>
                                        AI Room Assignment
                                    </span>
                                    <ChevronIcon open={aiOpen} />
                                </button>

                                {aiOpen && (
                                    <div className="sl-ai-card">
                                        <div className="sl-ai-content">
                                            <div className="sl-room-title">
                                                <span className="sl-bed-spark">
                                                    <BedSparkIcon />
                                                </span>
                                                <strong>{aiRoom}</strong>
                                            </div>

                                            <p>
                                                {hasAiRoom
                                                    ? 'Best match for location, preferences, and housekeeping flow.'
                                                    : 'No assignable room is currently available for this reservation.'}
                                            </p>

                                            <div className="sl-ai-buttons">
                                                <button
                                                    className="sl-ai-button"
                                                    type="button"
                                                    onClick={() => onAction('AI Assign')}
                                                    disabled={assignSaving}
                                                >
                                                    <span className="sl-ai-button-icon">
                                                        <BedSparkIcon />
                                                    </span>
                                                    <span>
                                                        <strong>AI Assign</strong>
                                                        <small>~ {aiRoom}</small>
                                                    </span>
                                                </button>

                                                <button
                                                    className="sl-manual-button"
                                                    type="button"
                                                    onClick={() => onAction('Manual Assign')}
                                                    disabled={assignSaving}
                                                >
                                                    <span className="sl-manual-icon">
                                                        <BedIcon />
                                                    </span>
                                                    <span>Manual Assign</span>
                                                </button>
                                            </div>
                                        </div>

                                        <MatchRing percent={selected.score ?? 0} />
                                    </div>
                                )}
                            </section>

                            <section className="sl-nested-card">
                                <button
                                    className="sl-section-header"
                                    type="button"
                                    onClick={() => setActionsOpen((value) => !value)}
                                    aria-expanded={actionsOpen}
                                >
                                    <span className="sl-section-title">
                                        <span className="sl-lightning">
                                            <LightningIcon />
                                        </span>
                                        Reservation Actions
                                    </span>
                                    <ChevronIcon open={actionsOpen} />
                                </button>

                                {actionsOpen && (
                                    <div className="sl-action-list">
                                        <ActionButton
                                            tone="green"
                                            icon={<UserIcon />}
                                            label={checkInSaving ? 'Checking in…' : 'Check In'}
                                            disabled={checkInSaving}
                                            onClick={() => onAction('Check In Worker')}
                                        />
                                        <ActionButton
                                            tone="orange"
                                            icon={<PauseIcon />}
                                            label="On-Hold"
                                            onClick={() => onAction('On-Hold')}
                                        />
                                        <ActionButton
                                            tone="blue"
                                            icon={<CheckoutIcon />}
                                            label="Check Out"
                                            onClick={() => onAction('Check Out Worker')}
                                        />

                                        <div className="sl-other" ref={otherSectionRef}>
                                            <button
                                                type="button"
                                                className="sl-action-button sl-action-gray sl-other-toggle"
                                                onClick={() => onToggleOther?.()}
                                                aria-expanded={otherOpen}
                                            >
                                                <span className="sl-action-left">
                                                    <span className="sl-action-icon">
                                                        <MoreIcon />
                                                    </span>
                                                    <span>Other</span>
                                                </span>
                                                <ChevronIcon open={otherOpen} />
                                            </button>

                                            {otherOpen && (
                                                <div className="sl-other-menu">
                                                    {OTHER_ITEMS.map(([icon, label, action]) => (
                                                        <button
                                                            key={label}
                                                            type="button"
                                                            className="sl-other-item"
                                                            onClick={() => onAction(action)}
                                                        >
                                                            <span className="sl-other-emoji">{icon}</span>
                                                            <span className="sl-other-label">{label}</span>
                                                            {['Remove On-Hold', 'Extend Stay', 'Add Notes'].includes(
                                                                label,
                                                            ) ? (
                                                                <span className="sl-other-caret">›</span>
                                                            ) : null}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>
                    ) : (
                        <div className="sl-empty">Select a reservation to view details and actions.</div>
                    ))}
            </div>
        </div>
    );
}

function MatchRing({ percent }) {
    const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
    const angle = safePercent * 3.6;

    return (
        <div
            className="sl-match-ring"
            style={{ background: `conic-gradient(#18b957 ${angle}deg, #e5e7eb ${angle}deg)` }}
            aria-label={`${safePercent}% match`}
        >
            <div>
                <strong>{safePercent}%</strong>
                <span>Match</span>
            </div>
        </div>
    );
}

function ActionButton({ tone, icon, label, onClick, disabled = false }) {
    return (
        <button
            className={`sl-action-button sl-action-${tone}`}
            type="button"
            onClick={onClick}
            disabled={disabled}
        >
            <span className="sl-action-left">
                <span className="sl-action-icon">{icon}</span>
                <span>{label}</span>
            </span>
            <ArrowRightIcon />
        </button>
    );
}

function SlidersIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h4M12 7h8M4 17h8M16 17h4M4 12h10M18 12h2" />
            <circle cx="10" cy="7" r="2" />
            <circle cx="14" cy="17" r="2" />
            <circle cx="16" cy="12" r="2" />
        </svg>
    );
}

function ChevronIcon({ open }) {
    return (
        <svg className={`sl-chevron ${open ? 'is-open' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
            <path d="m6 15 6-6 6 6" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="m8 12 2.5 2.5L16.5 8" />
        </svg>
    );
}

function SparkleIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2l2.6 6.8L22 12l-7.4 3.2L12 22l-2.6-6.8L2 12l7.4-3.2L12 2z" />
        </svg>
    );
}

function BedIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 5v14M4 13h16M20 11v8M7 10h5.5a2.5 2.5 0 0 1 2.5 2.5V13H7z" />
            <path d="M7 10V8.5A1.5 1.5 0 0 1 8.5 7h2A1.5 1.5 0 0 1 12 8.5V10" />
        </svg>
    );
}

function BedSparkIcon() {
    return (
        <svg viewBox="0 0 28 24" aria-hidden="true">
            <path d="M3 6v14M3 14h17M20 12v8M6 11h6.5a2.5 2.5 0 0 1 2.5 2.5v.5H6z" />
            <path d="M6 11V9.5A1.5 1.5 0 0 1 7.5 8h2A1.5 1.5 0 0 1 11 9.5V11" />
            <path className="sl-bed-sparkle-path" d="M22 3l.9 2.1L25 6l-2.1.9L22 9l-.9-2.1L19 6l2.1-.9L22 3z" />
        </svg>
    );
}

function LightningIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M13 2 4 14h7l-1 8 10-13h-7l0-7z" />
        </svg>
    );
}

function UserIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="7" r="4" />
            <path d="M5 21a7 7 0 0 1 14 0" />
        </svg>
    );
}

function PauseIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <rect x="6" y="4" width="4" height="16" rx="1.5" />
            <rect x="14" y="4" width="4" height="16" rx="1.5" />
        </svg>
    );
}

function CheckoutIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12a7 7 0 1 0 2-5" />
            <path d="M5 4v5h5" />
            <path d="M13 8v5l3 2" />
        </svg>
    );
}

function MoreIcon() {
    return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="6" cy="12" r="1.5" />
            <circle cx="12" cy="12" r="1.5" />
            <circle cx="18" cy="12" r="1.5" />
        </svg>
    );
}

function ArrowRightIcon() {
    return (
        <svg className="sl-arrow" viewBox="0 0 24 24" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
        </svg>
    );
}

const styles = `
.sl-control-panel {
  --sl-navy: #071a44;
  --sl-muted: #65728c;
  --sl-border: #dbe7f7;
  --sl-soft-border: #e8eef8;
  --sl-blue: #0876f8;
  --sl-blue-dark: #065ee8;
  --sl-green: #17ad4f;
  --sl-orange: #f28a00;
  --sl-purple: #5b1ee6;
  --sl-bg: #f7fbff;
  width: 100%;
  min-width: 0;
  font-family:
    Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI",
    sans-serif;
  color: var(--sl-navy);
  display: block;
}

.sl-control-panel *,
.sl-control-panel *::before,
.sl-control-panel *::after {
  box-sizing: border-box;
}

.sl-control-panel button {
  font: inherit;
}

.sl-panel-card {
  width: 100%;
  background:
    radial-gradient(circle at top right, rgba(36, 127, 255, 0.08), transparent 34%),
    linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  border: 1px solid var(--sl-border);
  border-radius: 20px;
  box-shadow:
    0 18px 45px rgba(9, 27, 69, 0.08),
    0 4px 12px rgba(9, 27, 69, 0.05);
  padding: 14px;
}

.sl-panel-header,
.sl-section-header {
  border: 0;
  background: transparent;
  color: var(--sl-navy);
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  text-align: left;
}

.sl-panel-header {
  padding: 4px 2px 14px;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.04em;
}

.sl-header-left,
.sl-section-title,
.sl-action-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sl-header-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: linear-gradient(180deg, #f2f7ff, #eaf2ff);
  color: #0a52d8;
}

.sl-header-icon svg,
.sl-action-icon svg,
.sl-check-icon svg,
.sl-sparkle-blue svg,
.sl-lightning svg,
.sl-arrow,
.sl-chevron {
  width: 22px;
  height: 22px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sl-panel-body {
  display: grid;
  gap: 14px;
}

.sl-reservation-card,
.sl-nested-card {
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid var(--sl-border);
  border-radius: 16px;
  box-shadow: 0 8px 22px rgba(12, 36, 76, 0.04);
}

.sl-reservation-card {
  padding: 14px;
  background:
    linear-gradient(135deg, rgba(236, 255, 244, 0.72), rgba(255, 255, 255, 0.92) 68%),
    #ffffff;
  border-color: #cfe9de;
  transition: background 0.18s ease, border-color 0.18s ease;
}

.sl-reservation-card.is-pending {
  background: #ffffff;
  border-color: var(--sl-border);
}

.sl-reservation-top {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sl-avatar {
  width: 58px;
  height: 58px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: #ffffff;
  font-size: 22px;
  font-weight: 800;
  box-shadow: 0 10px 26px rgba(9, 27, 69, 0.18);
}

.sl-reservation-id {
  min-width: 0;
}

.sl-reservation-top h3 {
  margin: 0 0 3px;
  color: var(--sl-navy);
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.03em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sl-company-sub {
  margin: 0 0 7px;
  color: var(--sl-muted);
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sl-status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 7px;
  padding: 4px 9px;
  color: #571bd7;
  background: #f0e8ff;
  font-size: 13px;
  font-weight: 700;
}

.sl-divider {
  height: 1px;
  background: #e4edf7;
  margin: 14px 0;
}

.sl-detail-grid {
  margin: 0;
  display: grid;
  gap: 11px;
}

.sl-detail-grid div {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
}

.sl-detail-grid dt {
  color: var(--sl-muted);
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}

.sl-detail-grid dd {
  margin: 0;
  min-width: 0;
  color: var(--sl-navy);
  font-size: 14px;
  font-weight: 800;
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sl-approval-inline {
  margin-top: 16px;
  width: 100%;
  min-height: 72px;
  display: flex;
  align-items: center;
  gap: 14px;
  border: 1px solid #ceeadc;
  border-radius: 11px;
  background: rgba(245, 255, 249, 0.72);
  padding: 12px 14px;
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease;
}

.sl-approval-inline:hover {
  transform: translateY(-1px);
}

.sl-approval-inline.is-pending {
  border-color: #fde6ba;
  background: rgba(255, 248, 233, 0.85);
}

.sl-check-icon {
  color: var(--sl-green);
  flex: 0 0 auto;
}

.sl-check-icon svg {
  width: 28px;
  height: 28px;
}

.sl-approval-inline strong {
  display: block;
  color: var(--sl-green);
  font-size: 16px;
  font-weight: 800;
}

.sl-approval-inline span {
  display: block;
  margin-top: 4px;
  color: #465470;
  font-size: 13px;
  font-weight: 600;
}

.sl-approval-inline.is-pending .sl-check-icon,
.sl-approval-inline.is-pending strong {
  color: var(--sl-orange);
}

.sl-nested-card {
  padding: 12px;
}

.sl-section-header {
  padding: 0 2px 11px;
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.sl-sparkle-blue {
  color: #0d7af8;
  flex: 0 0 auto;
}

.sl-sparkle-blue svg {
  fill: currentColor;
  stroke: none;
  width: 24px;
  height: 24px;
}

.sl-lightning {
  color: var(--sl-orange);
  flex: 0 0 auto;
}

.sl-lightning svg {
  fill: currentColor;
  stroke: none;
  width: 24px;
  height: 24px;
}

.sl-chevron {
  color: var(--sl-navy);
  transition: transform 0.18s ease;
  flex: 0 0 auto;
}

.sl-chevron:not(.is-open) {
  transform: rotate(180deg);
}

.sl-ai-card {
  position: relative;
  border: 1px solid #cfe0ff;
  border-radius: 12px;
  background: linear-gradient(180deg, #ffffff, #fbfdff);
  padding: 12px;
  min-height: 150px;
}

.sl-ai-content {
  padding-right: 0;
}

.sl-room-title {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--sl-blue);
  margin-bottom: 6px;
  padding-right: 74px;
}

.sl-room-title strong {
  font-size: 19px;
  font-weight: 850;
  letter-spacing: -0.03em;
}

.sl-bed-spark,
.sl-ai-button-icon,
.sl-manual-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
}

.sl-bed-spark svg,
.sl-ai-button-icon svg,
.sl-manual-icon svg {
  stroke: currentColor;
  fill: none;
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sl-bed-spark svg {
  width: 28px;
  height: 24px;
}

.sl-bed-sparkle-path {
  fill: currentColor;
  stroke: none;
}

.sl-ai-card p {
  margin: 0 0 13px;
  padding-right: 74px;
  color: #3e4c69;
  font-size: 13px;
  font-weight: 650;
  line-height: 1.45;
}

.sl-ai-card p::before {
  content: "•";
  color: var(--sl-navy);
  margin-right: 8px;
  font-weight: 900;
}

.sl-match-ring {
  position: absolute;
  top: 16px;
  right: 12px;
  width: 64px;
  height: 64px;
  display: grid;
  place-items: center;
  border-radius: 50%;
}

.sl-match-ring::before {
  content: "";
  position: absolute;
  inset: 9px;
  background: #ffffff;
  border-radius: 50%;
}

.sl-match-ring div {
  position: relative;
  z-index: 1;
  text-align: center;
}

.sl-match-ring strong {
  display: block;
  color: var(--sl-navy);
  font-size: 14px;
  font-weight: 850;
  line-height: 1;
}

.sl-match-ring span {
  display: block;
  color: #52617b;
  font-size: 11px;
  font-weight: 750;
  margin-top: 3px;
}

.sl-ai-buttons {
  display: grid;
  grid-template-columns: 1.08fr 1fr;
  gap: 8px;
}

.sl-ai-button,
.sl-manual-button {
  min-height: 58px;
  border-radius: 9px;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.sl-ai-button:hover,
.sl-manual-button:hover,
.sl-action-button:hover {
  transform: translateY(-1px);
}

.sl-ai-button:disabled,
.sl-manual-button:disabled,
.sl-action-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  transform: none;
}

.sl-ai-button {
  border: 1px solid var(--sl-blue);
  color: #ffffff;
  background: linear-gradient(135deg, var(--sl-blue), var(--sl-blue-dark));
  box-shadow: 0 12px 24px rgba(8, 118, 248, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 8px;
}

.sl-ai-button svg {
  width: 26px;
  height: 22px;
}

.sl-ai-button span:last-child {
  display: grid;
  line-height: 1.05;
  text-align: left;
}

.sl-ai-button strong {
  font-size: 15px;
  font-weight: 850;
  white-space: nowrap;
}

.sl-ai-button small {
  margin-top: 5px;
  font-size: 12px;
  font-weight: 700;
  opacity: 0.9;
  white-space: nowrap;
}

.sl-manual-button {
  border: 1px solid var(--sl-blue);
  background: #ffffff;
  color: var(--sl-blue);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 8px;
  font-size: 15px;
  font-weight: 850;
  line-height: 1.1;
}

.sl-manual-button svg {
  width: 26px;
  height: 22px;
}

.sl-action-list {
  display: grid;
  gap: 8px;
}

.sl-action-button {
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 9px;
  padding: 8px 12px;
  cursor: pointer;
  border: 1px solid;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    filter 0.15s ease;
}

.sl-action-button svg {
  width: 21px;
  height: 21px;
}

.sl-action-button .sl-action-left {
  gap: 13px;
  font-size: 16px;
  font-weight: 800;
}

.sl-action-green {
  color: var(--sl-green);
  border-color: #c9f0d9;
  background: linear-gradient(90deg, #effcf4, #fafffc);
}

.sl-action-orange {
  color: var(--sl-orange);
  border-color: #fde6ba;
  background: linear-gradient(90deg, #fff8e9, #fffefd);
}

.sl-action-blue {
  color: var(--sl-blue);
  border-color: #d7e7ff;
  background: linear-gradient(90deg, #f2f7ff, #ffffff);
}

.sl-action-gray {
  color: #37445e;
  border-color: #e0e6ef;
  background: linear-gradient(90deg, #f5f7fa, #ffffff);
}

.sl-action-gray .sl-action-icon {
  width: 25px;
  height: 25px;
  display: grid;
  place-items: center;
  color: #1d2b46;
  background: #edf1f6;
  border-radius: 50%;
}

.sl-action-gray .sl-action-icon svg {
  width: 18px;
  height: 18px;
  fill: currentColor;
  stroke: none;
}

.sl-action-icon {
  color: currentColor;
}

.sl-action-icon svg,
.sl-arrow {
  stroke: currentColor;
}

.sl-other {
  display: grid;
  gap: 6px;
}

.sl-other-toggle {
  justify-content: space-between;
}

.sl-other-menu {
  display: grid;
  gap: 4px;
  padding: 2px;
}

.sl-other-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  border: 0;
  background: #ffffff;
  border-radius: 9px;
  padding: 9px 10px;
  text-align: left;
  cursor: pointer;
  font-size: 14px;
  font-weight: 700;
  color: var(--sl-navy);
}

.sl-other-item:hover {
  background: #f4f8ff;
}

.sl-other-emoji {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border-radius: 9px;
  background: #eef4ff;
  font-size: 15px;
}

.sl-other-label {
  flex: 1;
}

.sl-other-caret {
  color: #9aa6bd;
  font-size: 17px;
  font-weight: 700;
}

.sl-empty {
  padding: 26px 8px;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--sl-muted);
}
`;
