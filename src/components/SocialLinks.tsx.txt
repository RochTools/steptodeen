"use client";

import { useState, useRef, useEffect } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SocialLink {
  id: string;
  label: string;
  sublabel: string;
  url: string;
  brandColor: string;
  icon: React.ReactNode;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const DotsIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
    <circle cx="10" cy="4"  r="1.8" />
    <circle cx="10" cy="10" r="1.8" />
    <circle cx="10" cy="16" r="1.8" />
  </svg>
);

const ExternalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>
);

// ─── Data (real links) ────────────────────────────────────────────────────────

const SOCIAL_LINKS: SocialLink[] = [
  {
    id: "whatsapp",
    label: "WhatsApp",
    sublabel: "Channel",
    url: "https://whatsapp.com/channel/0029VbAs3L2HAdNarzPISZ2z",
    brandColor: "#25D366",
    icon: <WhatsAppIcon />,
  },
  {
    id: "youtube",
    label: "YouTube",
    sublabel: "@steptodeen",
    url: "https://www.youtube.com/@steptodeen",
    brandColor: "#FF0000",
    icon: <YouTubeIcon />,
  },
  {
    id: "tiktok",
    label: "TikTok",
    sublabel: "@steptodeen.pk",
    url: "https://www.tiktok.com/@steptodeen.pk",
    brandColor: "#010101",
    icon: <TikTokIcon />,
  },
  {
    id: "linkedin",
    label: "LinkedIn",
    sublabel: "Zameer Baloch",
    url: "https://www.linkedin.com/in/zameer-baloch-a28055408",
    brandColor: "#0A66C2",
    icon: <LinkedInIcon />,
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SocialLinks() {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <>
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)  scale(1); }
        }
        .social-trigger:hover {
          background: #f1f5f9 !important;
          color: #334155 !important;
        }
        .social-trigger.active {
          background: #e2e8f0 !important;
          color: #1e293b !important;
        }
      `}</style>

      <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>

        {/* ── Trigger: three dots ── */}
        <button
          onClick={() => setOpen((p) => !p)}
          aria-label="Follow us on social media"
          aria-expanded={open}
          aria-haspopup="menu"
          className={`social-trigger${open ? " active" : ""}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 8,
            border: "1px solid #e2e8f0",
            background: open ? "#e2e8f0" : "#ffffff",
            color: "#64748b",
            cursor: "pointer",
            transition: "all 0.15s ease",
            boxShadow: open
              ? "0 1px 3px rgba(0,0,0,0.08)"
              : "0 1px 2px rgba(0,0,0,0.05)",
          }}
        >
          <DotsIcon />
        </button>

        {/* ── Dropdown ── */}
        {open && (
          <div
            role="menu"
            style={{
              position: "absolute",
              top: "calc(100% + 10px)",
              right: 0,
              width: 230,
              background: "#ffffff",
              border: "1px solid #e8ecf0",
              borderRadius: 14,
              boxShadow:
                "0 4px 6px -1px rgba(0,0,0,0.07), 0 10px 30px -5px rgba(0,0,0,0.1)",
              padding: "8px",
              zIndex: 999,
              animation: "slideDown 0.18s cubic-bezier(0.16,1,0.3,1)",
            }}
          >
            {/* arrow */}
            <div
              style={{
                position: "absolute",
                top: -5,
                right: 13,
                width: 10,
                height: 10,
                background: "#ffffff",
                border: "1px solid #e8ecf0",
                borderBottom: "none",
                borderRight: "none",
                transform: "rotate(45deg)",
                borderRadius: "2px 0 0 0",
              }}
            />

            {/* header */}
            <div
              style={{
                padding: "4px 8px 8px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#94a3b8",
              }}
            >
              Follow Us
            </div>

            {/* divider */}
            <div style={{ height: 1, background: "#f1f5f9", marginBottom: 4 }} />

            {SOCIAL_LINKS.map((link) => {
              const isHovered = hovered === link.id;
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  role="menuitem"
                  onMouseEnter={() => setHovered(link.id)}
                  onMouseLeave={() => setHovered(null)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 9,
                    textDecoration: "none",
                    background: isHovered ? `${link.brandColor}0d` : "transparent",
                    transition: "background 0.12s ease",
                    cursor: "pointer",
                  }}
                >
                  {/* icon circle */}
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: isHovered ? `${link.brandColor}18` : "#f8fafc",
                      color: isHovered ? link.brandColor : "#64748b",
                      flexShrink: 0,
                      transition: "all 0.12s ease",
                      border: `1.5px solid ${isHovered ? `${link.brandColor}30` : "#f1f5f9"}`,
                    }}
                  >
                    {link.icon}
                  </span>

                  {/* text */}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: 13,
                        fontWeight: 600,
                        color: isHovered ? link.brandColor : "#1e293b",
                        lineHeight: 1.3,
                        transition: "color 0.12s ease",
                      }}
                    >
                      {link.label}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontSize: 11,
                        color: "#94a3b8",
                        lineHeight: 1.3,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {link.sublabel}
                    </span>
                  </span>

                  {/* external link icon */}
                  <span
                    style={{
                      color: isHovered ? link.brandColor : "#cbd5e1",
                      opacity: isHovered ? 1 : 0.6,
                      transition: "all 0.12s ease",
                      flexShrink: 0,
                    }}
                  >
                    <ExternalIcon />
                  </span>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
