import { useState, useEffect, useRef, useCallback } from "react";
import { claimTypes, getAnalysisSteps, type ClaimConfig, type Question } from "../lib/claims";
import { useFocusTrap } from "../hooks/useFocusTrap";

const WIZARD_DRAFT_KEY = "plaidezy_wizard_draft";

interface WizardModalProps {
  onClose: () => void;
  onEligible: (claim: ClaimConfig, answers: Record<string, string>) => void;
  preselectedClaimId?: string | null;
  initialClaimId?: string | null;
  initialAnswers?: Record<string, string>;
}

/* ─── Custom Select Component ─── */
function CustomSelect({
  value,
  options,
  placeholder,
  onChange,
  required,
  className,
}: {
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  onChange: (val: string) => void;
  required?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectedLabel = options.find((o) => o.value === value)?.label || "";
  const isEmpty = !value;

  return (
    <div ref={ref} className={`${className ? `${className} ` : ""}custom-select-root${open ? " open" : ""}`}>
      <button
        type="button"
        className={`custom-select-trigger${isEmpty ? " empty" : ""}${open ? " open" : ""}`}
        onClick={() => setOpen(!open)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{selectedLabel || placeholder}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="custom-select-dropdown" role="listbox">
          <div className="custom-select-options">
            {options.map((o) => (
              <div
                key={o.value}
                className={`custom-select-option${o.value === value ? " selected" : ""}`}
                role="option"
                aria-selected={o.value === value}
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
              >
                {o.value === value && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
                <span>{o.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Custom Date Picker Component ─── */
const DATE_MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];
const DATE_WEEK_DAYS = ["lu", "ma", "me", "je", "ve", "sa", "di"];

function padDatePart(n: number) {
  return String(n).padStart(2, "0");
}

function dateToIso(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function parseIsoDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);

  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }

  return date;
}

function formatDateInput(value: string) {
  const date = parseIsoDate(value);
  if (!date) return "";
  return `${padDatePart(date.getDate())}/${padDatePart(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function isSameDay(a: Date | null, b: Date) {
  return !!a && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function CustomDatePicker({
  value,
  placeholder = "jj/mm/aaaa",
  onChange,
  required,
}: {
  value: string;
  placeholder?: string;
  onChange: (val: string) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseIsoDate(value);
  const today = new Date();
  const [viewDate, setViewDate] = useState<Date>(() => selectedDate || today);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) setViewDate(selectedDate || today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", keyHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", keyHandler);
    };
  }, []);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const firstWeekday = (firstDayOfMonth.getDay() + 6) % 7; // lundi = 0
  const calendarStart = new Date(year, month, 1 - firstWeekday);
  const days = Array.from({ length: 42 }, (_, i) => new Date(calendarStart.getFullYear(), calendarStart.getMonth(), calendarStart.getDate() + i));
  const displayValue = formatDateInput(value);

  const changeMonth = (delta: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  const selectDate = (date: Date) => {
    onChange(dateToIso(date));
    setOpen(false);
  };

  const selectToday = () => {
    const now = new Date();
    onChange(dateToIso(now));
    setViewDate(now);
    setOpen(false);
  };

  return (
    <div ref={ref} className={`custom-date-root${open ? " open" : ""}`}>
      <button
        type="button"
        className={`custom-date-trigger${!displayValue ? " empty" : ""}${open ? " open" : ""}`}
        onClick={() => setOpen(!open)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-required={required}
      >
        <span>{displayValue || placeholder}</span>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="3" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {open && (
        <div className="custom-date-dropdown" role="dialog" aria-label="Choisir une date">
          <div className="custom-date-header">
            <button type="button" className="custom-date-nav" onClick={() => changeMonth(-1)} aria-label="Mois précédent">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <div className="custom-date-current">
              {DATE_MONTHS[month]} <span>{year}</span>
            </div>
            <button type="button" className="custom-date-nav" onClick={() => changeMonth(1)} aria-label="Mois suivant">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div className="custom-date-weekdays">
            {DATE_WEEK_DAYS.map((day) => <span key={day}>{day}</span>)}
          </div>

          <div className="custom-date-grid">
            {days.map((day) => {
              const outside = day.getMonth() !== month;
              const selected = isSameDay(selectedDate, day);
              const currentToday = isSameDay(today, day);
              return (
                <button
                  key={dateToIso(day)}
                  type="button"
                  className={`custom-date-day${outside ? " outside" : ""}${selected ? " selected" : ""}${currentToday ? " today" : ""}`}
                  onClick={() => selectDate(day)}
                  aria-pressed={selected}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="custom-date-footer">
            <button type="button" className="custom-date-action" onClick={() => { onChange(""); setOpen(false); }}>
              Effacer
            </button>
            <button type="button" className="custom-date-action primary" onClick={selectToday}>
              Aujourd'hui
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


/* ─── Toast Component ─── */
function Toast({ visible, type, title, message, onClose }: { visible: boolean; type: 'success' | 'error' | 'info'; title: string; message: string; onClose: () => void }) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  const icons = {
    success: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    error: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
    info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  };

  const colors = {
    success: { bg: 'var(--primary-light)', color: 'var(--primary)' },
    error: { bg: '#FEE2E2', color: 'var(--accent-rose)' },
    info: { bg: '#F3E8FF', color: 'var(--accent-violet)' },
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '100px'})`,
      padding: '14px 20px',
      borderRadius: 12,
      background: '#fff',
      border: '1px solid var(--border)',
      boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      opacity: visible ? 1 : 0,
      visibility: visible ? 'visible' : 'hidden',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      zIndex: 9999,
      minWidth: 280,
    }}>
      <div style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: colors[type].bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: colors[type].color,
        flexShrink: 0,
      }}>
        {icons[type]}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{title}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{message}</span>
      </div>
      <button
        onClick={onClose}
        style={{
          marginLeft: 'auto',
          padding: 4,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-light)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-light)'; }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  );
}

/* ─── Skeleton Loader ─── */
function SkeletonLoader({ lines = 3 }: { lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} style={{
          height: i === 0 ? 48 : 14,
          borderRadius: 8,
          background: 'linear-gradient(90deg, var(--border) 25%, var(--bg-secondary) 50%, var(--border) 75%)',
          backgroundSize: '200% 100%',
          animation: `shimmer 1.5s infinite`,
          animationDelay: `${i * 0.1}s`,
        }} />
      ))}
    </div>
  );
}

/* ─── Copy Button ─── */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      onClick={handleCopy}
      style={{
        padding: '8px 14px',
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: copied ? 'var(--primary)' : 'var(--surface)',
        color: copied ? '#fff' : 'var(--text-primary)',
        border: `1px solid ${copied ? 'var(--primary)' : 'var(--border)'}`,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      onMouseEnter={(e) => { if (!copied) { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.background = 'var(--primary-light)'; } }}
      onMouseLeave={(e) => { if (!copied) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface)'; } }}
    >
      {copied ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          Copié !
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
          Copier
        </>
      )}
    </button>
  );
}

/* ─── Tooltip ─── */
function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  return (
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {children}
      <div style={{
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        left: '50%',
        transform: 'translateX(-50%) translateY(4px)',
        padding: '6px 12px',
        background: 'var(--text-primary)',
        color: '#fff',
        fontSize: 11,
        fontWeight: 600,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        borderRadius: 6,
        whiteSpace: 'nowrap',
        opacity: 0,
        visibility: 'hidden',
        transition: 'all 0.2s',
        zIndex: 10,
        pointerEvents: 'none',
      }} className="tooltip-text">
        {text}
      </div>
      <style>{`
        div:hover > .tooltip-text {
          opacity: 1 !important;
          visibility: visible !important;
          transform: translateX(-50%) translateY(0) !important;
        }
      `}</style>
    </div>
  );
}

export default function WizardModal({ onClose, onEligible, preselectedClaimId, initialClaimId, initialAnswers }: WizardModalProps) {
  let draftClaimId: string | null = null;
  let draftAnswers: Record<string, string> = {};
  try {
    const draft = JSON.parse(localStorage.getItem(WIZARD_DRAFT_KEY) || "{}");
    if (draft?.claimId && draft?.answers) {
      draftClaimId = draft.claimId;
      draftAnswers = draft.answers;
    }
  } catch { /* noop */ }

  const preId = preselectedClaimId ?? initialClaimId ?? draftClaimId ?? null;
  const initialClaim = preId ? claimTypes.find((c) => c.id === preId) || null : null;
  const initialAnswerState = initialAnswers && Object.keys(initialAnswers).length > 0 ? initialAnswers : draftAnswers;
  const [step, setStep] = useState(initialClaim ? 1 : 0);
  const [selectedClaim, setSelectedClaim] = useState<ClaimConfig | null>(initialClaim);
  const [answers, setAnswers] = useState<Record<string, string>>(() => initialAnswerState || {});
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [confirmClose, setConfirmClose] = useState(false);
  const [toast, setToast] = useState<{ visible: boolean; type: 'success' | 'error' | 'info'; title: string; message: string }>({ visible: false, type: 'success', title: '', message: '' });
  const backdropRef = useRef<HTMLDivElement>(null);
  const trapRef = useFocusTrap(!confirmClose);
  const confirmRef = useFocusTrap(confirmClose);
  const [hoveredClaim, setHoveredClaim] = useState<string | null>(null);

  const isDirty = step > 0 && step < 3 && Object.keys(answers).length > 0;

  const showToast = useCallback((type: 'success' | 'error' | 'info', title: string, message: string) => {
    setToast({ visible: true, type, title, message });
  }, []);

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }));
  }, []);

  const tryClose = useCallback(() => {
    if (isDirty) { setConfirmClose(true); } else { onClose(); }
  }, [isDirty, onClose]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (toast.visible) {
          hideToast();
        } else if (confirmClose) {
          setConfirmClose(false);
        } else {
          tryClose();
        }
      }
      if (e.key === "Enter" && !e.target?.toString().includes('[object HTML')) {
        const nextBtn = document.querySelector('.wizard-btn-next:not(:disabled)') as HTMLButtonElement;
        if (nextBtn && document.activeElement?.classList.contains('wizard-option')) {
          nextBtn.click();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [tryClose, confirmClose, toast.visible, hideToast]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) tryClose();
  };

  const setAnswer = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  useEffect(() => {
    if (!selectedClaim || Object.keys(answers).length === 0) return;
    try {
      localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify({ claimId: selectedClaim.id, answers, updatedAt: Date.now() }));
    } catch { /* noop */ }
  }, [selectedClaim, answers]);

  useEffect(() => {
    if (step !== 2) return;
    setAnalysisProgress(0);
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    [400, 1100, 1800, 2600].forEach((delay, i) => {
      timeouts.push(setTimeout(() => setAnalysisProgress(i + 1), delay));
    });
    timeouts.push(setTimeout(() => {
      setStep(3);
      if (selectedClaim?.checkEligibility(answers).eligible) {
        showToast('success', 'Analyse terminée !', 'Vous êtes éligible à une réclamation');
      }
    }, 3200));
    return () => timeouts.forEach(clearTimeout);
  }, [step]);

  const runAnalysis = () => {
    showToast('info', 'Analyse en cours', 'Vérification de vos droits en cours...');
    setStep(2);
  };

  const selectedQuestions: Question[] = selectedClaim?.questions || [];
  const isFormValid = selectedQuestions.filter((q) => q.required).every((q) => answers[q.id]?.trim());
  const eligibility = selectedClaim ? selectedClaim.checkEligibility(answers) : { eligible: false };

  const claimIcons: Record<string, JSX.Element> = {
    vol: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.8 19.2L16 11l3.5-3.5C20.9 6.1 22 4 22 4s-2.1 1.1-3.5 2.5L15 10l-8.2-1.8c-.4-.1-.8.1-1 .4L4 11l6 3 3 6 2.4-1.8c.3-.2.5-.6.4-1z"/></svg>,
    parking: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 17V7h4a3 3 0 010 6H9"/></svg>,
    colis: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>,
    train: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16M12 3v8M8 19l-2 3M16 19l2 3"/></svg>,
    caution: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  };

  const stepLabels = ['Type', 'Détails', 'Analyse', 'Résultat'];
  const progressPercentage = ((step + 1) / 4) * 100;

  return (
    <>
      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes checkPop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.15); }
          100% { transform: scale(1); opacity: 1; }
        }
        .wizard-option:active { transform: scale(0.98); }
        .wizard-btn-next:active:not(:disabled) { transform: scale(0.98); }
        .wizard-btn-back:active { transform: scale(0.98); }
        .modal-close:active { transform: scale(0.9); }
      `}</style>

      <div className="modal-backdrop" ref={backdropRef} onClick={handleBackdrop}>
        <div style={{
          position: 'absolute',
          top: 16,
          left: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          color: 'var(--text-light)',
          fontFamily: "'Space Grotesk', sans-serif",
          zIndex: 10,
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 22,
            height: 20,
            padding: '0 6px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 4,
            fontWeight: 600,
          }}>Esc</span>
          pour fermer
        </div>

        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'var(--border)',
          zIndex: 10,
        }}>
          <div style={{
            height: '100%',
            width: `${progressPercentage}%`,
            background: 'var(--primary)',
            borderRadius: '0 3px 3px 0',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 10px rgba(13, 148, 136, 0.5)',
          }} />
        </div>

        <div style={{
          position: 'absolute',
          top: 16,
          right: 56,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          fontWeight: 600,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: 'var(--text-muted)',
          zIndex: 10,
        }}>
          <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{step + 1}</span>
          <span>/</span>
          <span>4</span>
          <span style={{ marginLeft: 4, color: 'var(--text-light)', fontWeight: 400 }}>— {stepLabels[step]}</span>
        </div>

        {confirmClose && (
          <div className="modal-backdrop" style={{ zIndex: 600 }}>
            <div className="modal-content" ref={confirmRef as any} style={{
              maxWidth: 380,
              textAlign: 'center',
              padding: '40px 32px',
              animation: 'checkPop 0.3s ease',
            }}>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'var(--accent-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, fontFamily: "'Sora', sans-serif", letterSpacing: '-0.3px' }}>
                Abandonner votre réclamation ?
              </h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24, fontFamily: "'Manrope', sans-serif", lineHeight: 1.6 }}>
                Vos réponses ne seront pas sauvegardées.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  className="wizard-btn-back"
                  onClick={() => setConfirmClose(false)}
                  autoFocus
                  style={{ flex: 1 }}
                >
                  Continuer
                </button>
                <button
                  className="wizard-btn-next"
                  onClick={() => { showToast('info', 'À bientôt !', 'Revenez quand vous serez prêt'); onClose(); }}
                  style={{ flex: 1, background: 'var(--accent-rose)' }}
                >
                  Quitter
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="modal-content" ref={trapRef as any}>
          <Tooltip text="Fermer (Esc)">
            <button
              className="modal-close"
              onClick={tryClose}
              aria-label="Fermer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
          </Tooltip>

          <div className="modal-body">
            <div className="wizard-progress">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`wizard-step-dot${i === step ? " active" : i < step ? " done" : ""}`}
                />
              ))}
            </div>

            {step === 0 && (
              <div style={{ animation: 'fadeInUp 0.4s ease' }}>
                <h2 className="wizard-title">Quel est votre cas ?</h2>
                <p className="wizard-subtitle">Sélectionnez le type de réclamation pour vérifier vos droits.</p>
                {claimTypes.map((claim, index) => (
                  <button
                    key={claim.id}
                    className={`wizard-option${selectedClaim?.id === claim.id ? " selected" : ""}`}
                    onClick={() => {
                      setSelectedClaim(claim);
                      setAnswers({});
                      showToast('success', claim.name, 'Sélectionné ! Continuez');
                    }}
                    onMouseEnter={() => setHoveredClaim(claim.id)}
                    onMouseLeave={() => setHoveredClaim(null)}
                    aria-pressed={selectedClaim?.id === claim.id}
                    style={{
                      animation: `fadeInUp 0.4s ease ${index * 0.08}s both`,
                      transform: hoveredClaim === claim.id ? 'translateX(4px)' : 'translateX(0)',
                    }}
                  >
                    <div className="wizard-option-icon">
                      {claimIcons[claim.id] || null}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2, fontFamily: "'Sora', sans-serif" }}>{claim.name}</div>
                      <div style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-muted)', fontFamily: "'Manrope', sans-serif" }}>{claim.desc}</div>
                    </div>
                    {selectedClaim?.id === claim.id && (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                ))}
                <div className="wizard-btn-row">
                  <button
                    className="wizard-btn-next"
                    disabled={!selectedClaim}
                    onClick={() => setStep(1)}
                  >
                    Continuer
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {step === 1 && selectedClaim && (
              <div style={{ animation: 'fadeInUp 0.4s ease' }}>
                <h2 className="wizard-title">{selectedClaim.name}</h2>
                <p className="wizard-subtitle">Répondez à ces questions pour évaluer vos droits.</p>
                {selectedQuestions.map((q, index) => (
                  <div
                    key={q.id}
                    className="wizard-field-wrapper"
                    style={{ animation: `fadeInUp 0.4s ease ${index * 0.08}s both` }}
                  >
                    <label className="wizard-field-label">
                      {q.label}
                      {q.required && <span className="wizard-required">*</span>}
                    </label>
                    <div className={`wizard-field-box${q.type === "select" || q.type === "date" ? " wizard-field-box--select" : ""}`}>
                      {q.type === "select" ? (
                        <CustomSelect
                          value={answers[q.id] || ""}
                          options={q.options || []}
                          placeholder="Sélectionner…"
                          onChange={(val) => setAnswer(q.id, val)}
                          required={q.required}
                        />
                      ) : q.type === "date" ? (
                        <CustomDatePicker
                          value={answers[q.id] || ""}
                          placeholder="jj/mm/aaaa"
                          onChange={(val) => setAnswer(q.id, val)}
                          required={q.required}
                        />
                      ) : q.type === "textarea" ? (
                        <textarea
                          className="wizard-textarea"
                          placeholder={q.placeholder || "Décrivez votre situation..."}
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswer(q.id, e.target.value)}
                          aria-required={q.required}
                          rows={4}
                        />
                      ) : (
                        <input
                          className="wizard-input"
                          type={q.type || "text"}
                          placeholder={q.placeholder || ""}
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswer(q.id, e.target.value)}
                          aria-required={q.required}
                        />
                      )}
                    </div>
                  </div>
                ))}
                <div className="wizard-btn-row">
                  <button className="wizard-btn-back" onClick={() => setStep(0)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                    </svg>
                    Retour
                  </button>
                  <button
                    className="wizard-btn-next"
                    disabled={!isFormValid}
                    onClick={runAnalysis}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                    </svg>
                    Analyser mes droits
                  </button>
                </div>
                <div className="wizard-progress-hint">
                  {selectedQuestions.filter(q => q.required).length} champs obligatoires
                  <span style={{ margin: '0 8px' }}>•</span>
                  {selectedQuestions.filter(q => q.required).filter(q => answers[q.id]?.trim()).length} remplis
                </div>
              </div>
            )}

            {step === 2 && selectedClaim && (
              <div style={{ animation: 'fadeInUp 0.4s ease' }}>
                <h2 className="wizard-title">Analyse en cours…</h2>
                <p className="wizard-subtitle">Vérification de vos droits selon les textes applicables.</p>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 24,
                  marginBottom: 16,
                }}>
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    animation: 'pulse 1s ease-in-out infinite',
                  }} />
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    animation: 'pulse 1s ease-in-out 0.2s infinite',
                  }} />
                  <div style={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    background: 'var(--primary)',
                    animation: 'pulse 1s ease-in-out 0.4s infinite',
                  }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 20 }}>
                  {getAnalysisSteps(selectedClaim.id).map((s, i) => (
                    <div
                      key={i}
                      className={`analysis-step${i < analysisProgress ? " visible" : ""}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '12px 0',
                        opacity: i < analysisProgress ? 1 : 0.4,
                        transform: i < analysisProgress ? 'translateX(0)' : 'translateX(-10px)',
                        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      <div style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        background: i < analysisProgress ? 'var(--primary-light)' : 'var(--bg-secondary)',
                        border: i < analysisProgress ? '2px solid var(--primary)' : '2px solid var(--border)',
                        transition: 'all 0.3s',
                      }}>
                        {i < analysisProgress ? (
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        ) : i === analysisProgress ? (
                          <div className="analysis-spinner" />
                        ) : (
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-light)' }}>{i + 1}</span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 14,
                        fontWeight: i < analysisProgress ? 600 : 400,
                        color: i < analysisProgress ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        transition: 'all 0.3s',
                      }}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
                <style>{`
                  @keyframes pulse {
                    0%, 100% { transform: scale(0.8); opacity: 0.5; }
                    50% { transform: scale(1.2); opacity: 1; }
                  }
                  @keyframes fadeInUp {
                    from { opacity: 0; transform: translateY(16px); }
                    to { opacity: 1; transform: translateY(0); }
                  }
                `}</style>
              </div>
            )}

            {step === 3 && selectedClaim && (
              <div style={{ animation: 'fadeInUp 0.4s ease' }}>
                {eligibility.eligible ? (
                  <div className="result-eligible">
                    <div className="result-check" style={{ animation: 'checkPop 0.5s ease' }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div className="result-amount" style={{ fontFamily: "'Sora', sans-serif", fontSize: 48, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-2px', marginBottom: 8 }}>
                      {selectedClaim.calculateAmount(answers)}
                    </div>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '8px 16px',
                      borderRadius: 50,
                      background: 'var(--primary-light)',
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--primary-dark)',
                      marginBottom: 20,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      </svg>
                      {selectedClaim.law}
                    </div>
                    <p className="result-desc" style={{ fontFamily: "'Manrope', sans-serif", fontSize: 15, lineHeight: 1.7, color: 'var(--text-muted)', marginBottom: 24 }}>
                      {eligibility.reason || "Vous êtes éligible à une réclamation. Générez votre lettre juridique personnalisée."}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 20 }}>
                      <div style={{
                        padding: '8px 16px',
                        background: 'var(--bg-secondary)',
                        borderRadius: 8,
                        fontFamily: "'Space Grotesk', monospace",
                        fontSize: 14,
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                      }}>
                        {selectedClaim.calculateAmount(answers)}
                      </div>
                      <CopyButton text={selectedClaim.calculateAmount(answers)} />
                    </div>
                    <button
                      className="wizard-btn-next"
                      style={{ width: '100%' }}
                      onClick={() => {
                        showToast('success', 'Parfait !', 'Génération de votre lettre en cours...');
                        try { localStorage.removeItem(WIZARD_DRAFT_KEY); } catch { /* noop */ }
                        onEligible(selectedClaim, answers);
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                      </svg>
                      Générer ma lettre — 9€
                    </button>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      marginTop: 16,
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
                      </svg>
                      Satisfait ou remboursé sous 7 jours
                    </div>
                  </div>
                ) : (
                  <div className="result-ineligible">
                    <div style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: 'var(--bg-secondary)',
                      border: '2px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 24px',
                    }}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-light)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: "'Sora', sans-serif", letterSpacing: '-0.3px' }}>
                      Réclamation non éligible
                    </h3>
                    <p style={{ fontFamily: "'Manrope', sans-serif", fontSize: 15, lineHeight: 1.7, color: 'var(--text-muted)', marginBottom: 24 }}>
                      {eligibility.reason || "D'après les informations fournies, votre situation ne semble pas éligible à une réclamation."}
                    </p>
                    <button
                      className="wizard-btn-back"
                      style={{ width: '100%', justifyContent: 'center' }}
                      onClick={() => {
                        showToast('info', 'Pas de panique', 'Vous pouvez essayer un autre cas');
                        onClose();
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                        <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                      </svg>
                      Réessayer avec un autre cas
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <Toast
        visible={toast.visible}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={hideToast}
      />
    </>
  );
}
