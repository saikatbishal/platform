/* @ds-bundle: {"format":4,"namespace":"PlatformDesignSystem_1d54fc","components":[{"name":"SignInButton","sourcePath":"components/auth/SignInButton.jsx"},{"name":"UserMenu","sourcePath":"components/auth/UserMenu.jsx"},{"name":"BoardBracket","sourcePath":"components/brand/BoardBracket.jsx"},{"name":"PlatformCanopy","sourcePath":"components/brand/PlatformCanopy.jsx"},{"name":"StationBoard","sourcePath":"components/brand/StationBoard.jsx"},{"name":"BoardChip","sourcePath":"components/core/BoardChip.jsx"},{"name":"Button","sourcePath":"components/core/Button.jsx"},{"name":"Sheet","sourcePath":"components/core/Sheet.jsx"},{"name":"VersionBadge","sourcePath":"components/core/VersionBadge.jsx"},{"name":"MilestoneList","sourcePath":"components/data/MilestoneList.jsx"},{"name":"StatBar","sourcePath":"components/data/StatBar.jsx"},{"name":"StationPicker","sourcePath":"components/forms/StationPicker.jsx"},{"name":"FieldLabel","sourcePath":"components/forms/TextField.jsx"},{"name":"TextField","sourcePath":"components/forms/TextField.jsx"},{"name":"SelectField","sourcePath":"components/forms/TextField.jsx"},{"name":"FieldNote","sourcePath":"components/forms/TextField.jsx"}],"sourceHashes":{"components/auth/SignInButton.jsx":"1c5eea9153cc","components/auth/UserMenu.jsx":"c16cfad3abac","components/brand/BoardBracket.jsx":"b8cd44531648","components/brand/PlatformCanopy.jsx":"408428620997","components/brand/StationBoard.jsx":"92e28a0ecf2b","components/core/BoardChip.jsx":"51c7ebeacb59","components/core/Button.jsx":"3faa40707bf1","components/core/Sheet.jsx":"a1a6da03a367","components/core/VersionBadge.jsx":"e35ca714d221","components/data/MilestoneList.jsx":"036e4b26ff72","components/data/StatBar.jsx":"986b587abc27","components/forms/StationPicker.jsx":"b6d50aeab15c","components/forms/TextField.jsx":"1c6ddcfdab56","ui_kits/platform-app/App.jsx":"64831ce57ea9","ui_kits/platform-app/IndiaMap.jsx":"72121973089c","ui_kits/platform-app/stations.js":"d152a53466bc"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.PlatformDesignSystem_1d54fc = window.PlatformDesignSystem_1d54fc || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/auth/SignInButton.jsx
try { (() => {
/** Google's "G", per their brand spec — the four official colours, unaltered. */
function GoogleG() {
  return /*#__PURE__*/React.createElement("svg", {
    width: "18",
    height: "18",
    viewBox: "0 0 48 48",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    fill: "#EA4335",
    d: "M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#4285F4",
    d: "M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#FBBC05",
    d: "M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
  }), /*#__PURE__*/React.createElement("path", {
    fill: "#34A853",
    d: "M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
  }));
}

/**
 * The one way into the app. Google's branding rules ask for their logo on a
 * plain light or dark surface, so this button stays neutral on purpose and
 * the surrounding card carries the app's character instead.
 *
 * In demo mode the Google mark is gone, because nothing about that session
 * involves Google and a borrowed logo would be a lie about where your data is.
 */
function SignInButton({
  mode = 'google',
  busy = false,
  onSignIn
}) {
  const [hover, setHover] = React.useState(false);
  const demo = mode === 'demo';
  const label = demo ? 'Look around with sample journeys' : busy ? 'Opening Google…' : 'Continue with Google';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: busy,
    onClick: onSignIn,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      width: '100%',
      minHeight: 'var(--tap-min)',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: '10px 20px',
      cursor: busy ? 'not-allowed' : 'pointer',
      borderRadius: 'var(--radius-sm)',
      border: 'var(--border-hair) solid var(--line-strong)',
      background: hover && !busy ? 'var(--line)' : 'var(--surface-2)',
      color: 'var(--ink)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-base)',
      fontWeight: 'var(--weight-semibold)',
      opacity: busy ? 0.6 : 1,
      transition: 'background-color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)'
    }
  }, !demo && /*#__PURE__*/React.createElement(GoogleG, null), /*#__PURE__*/React.createElement("span", null, label)), demo && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      textAlign: 'center',
      fontSize: 'var(--text-xs)',
      lineHeight: 'var(--leading-xs)',
      color: 'var(--ink-faint)'
    }
  }, "Google sign-in isn\u2019t connected yet, so this session lives in this browser alone."));
}
Object.assign(__ds_scope, { SignInButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/auth/SignInButton.jsx", error: String((e && e.message) || e) }); }

// components/auth/UserMenu.jsx
try { (() => {
/** Avatar chip in the corner; opens a small panel with the account and sign-out. */
function UserMenu({
  user = {
    name: '',
    email: ''
  },
  onSignOut,
  defaultOpen = false
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const [hover, setHover] = React.useState(false);
  const [hoverOut, setHoverOut] = React.useState(false);
  const initial = (user.name || '?').trim().charAt(0).toUpperCase();
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-expanded": open,
    "aria-label": `Account: ${user.name}`,
    onClick: () => setOpen(v => !v),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'grid',
      placeItems: 'center',
      height: 44,
      width: 44,
      cursor: 'pointer',
      borderRadius: 'var(--radius-round)',
      background: 'var(--surface)',
      border: `var(--border-hair) solid ${hover ? 'var(--accent)' : 'var(--line-strong)'}`,
      transition: 'border-color var(--duration-fast) var(--ease-standard)'
    }
  }, user.avatarUrl ? /*#__PURE__*/React.createElement("img", {
    src: user.avatarUrl,
    alt: "",
    referrerPolicy: "no-referrer",
    style: {
      height: 32,
      width: 32,
      borderRadius: '50%'
    }
  }) : /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--cream)'
    }
  }, initial)), open && /*#__PURE__*/React.createElement("div", {
    role: "menu",
    style: {
      position: 'absolute',
      top: '100%',
      right: 0,
      zIndex: 30,
      marginTop: 8,
      width: 240,
      padding: 4,
      borderRadius: 'var(--radius-sm)',
      border: 'var(--border-hair) solid var(--line)',
      background: 'var(--surface)',
      boxShadow: 'var(--shadow-sheet)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 12px',
      borderBottom: 'var(--border-hair) solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: 'var(--ink)'
    }
  }, user.name), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-xs)',
      color: 'var(--ink-faint)'
    }
  }, user.email)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    role: "menuitem",
    onClick: onSignOut,
    onMouseEnter: () => setHoverOut(true),
    onMouseLeave: () => setHoverOut(false),
    style: {
      marginTop: 4,
      width: '100%',
      textAlign: 'left',
      padding: '10px 12px',
      cursor: 'pointer',
      borderRadius: 'var(--radius-sm)',
      border: 'none',
      background: hoverOut ? 'var(--surface-2)' : 'transparent',
      color: hoverOut ? 'var(--vermillion)' : 'var(--ink-soft)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-sm)'
    }
  }, "Sign out")));
}
Object.assign(__ds_scope, { UserMenu });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/auth/UserMenu.jsx", error: String((e && e.message) || e) }); }

// components/brand/BoardBracket.jsx
try { (() => {
/**
 * The bracket the board hangs from: two steel hangers over a mounting rail.
 * preserveAspectRatio is off on purpose — the rail stretches to the card,
 * the hangers must not thicken with it.
 */
function BoardBracket() {
  return /*#__PURE__*/React.createElement("svg", {
    "aria-hidden": "true",
    viewBox: "0 0 200 14",
    preserveAspectRatio: "none",
    style: {
      display: 'block',
      height: 14,
      width: '100%',
      color: 'var(--board-frame)'
    }
  }, /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "0",
    width: "200",
    height: "3",
    fill: "currentColor",
    opacity: "0.9"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "34",
    y: "3",
    width: "3",
    height: "11",
    fill: "currentColor",
    opacity: "0.75"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "163",
    y: "3",
    width: "3",
    height: "11",
    fill: "currentColor",
    opacity: "0.75"
  }));
}
Object.assign(__ds_scope, { BoardBracket });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/BoardBracket.jsx", error: String((e && e.message) || e) }); }

// components/brand/PlatformCanopy.jsx
try { (() => {
/**
 * What the placard hangs under: a platform canopy with its sodium lamps lit.
 * Vector rather than a photograph — this is the one app whose whole argument
 * is that the map is hand-drawn, and it recolours with the theme because
 * every value is a token. Decorative: aria-hidden, nothing to resolve.
 */
function PlatformCanopy({
  height = '58%'
}) {
  const id = React.useId().replace(/:/g, '');
  return /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      pointerEvents: 'none',
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height,
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    viewBox: "0 0 320 244",
    preserveAspectRatio: "xMidYMin slice",
    style: {
      position: 'absolute',
      inset: 0,
      height: '100%',
      width: '100%',
      opacity: 0.4
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("radialGradient", {
    id: id
  }, /*#__PURE__*/React.createElement("stop", {
    offset: "0",
    stopColor: "var(--accent)",
    stopOpacity: "0.55"
  }), /*#__PURE__*/React.createElement("stop", {
    offset: "1",
    stopColor: "var(--accent)",
    stopOpacity: "0"
  }))), /*#__PURE__*/React.createElement("path", {
    d: "M-10 20 L160 4 L330 20 L330 28 L160 12 L-10 28 Z",
    fill: "var(--steel)",
    opacity: "0.75"
  }), [20, 120, 220, 300].map(x => /*#__PURE__*/React.createElement("g", {
    key: x,
    fill: "var(--steel)",
    opacity: "0.4"
  }, /*#__PURE__*/React.createElement("rect", {
    x: x,
    y: "22",
    width: "2.5",
    height: "222"
  }), /*#__PURE__*/React.createElement("path", {
    d: `M${x - 13} 30 L${x + 2.5} 22 L${x + 2.5} 35 Z`
  }))), [66, 254].map(x => /*#__PURE__*/React.createElement("g", {
    key: x
  }, /*#__PURE__*/React.createElement("rect", {
    x: x - 0.5,
    y: "10",
    width: "1",
    height: "26",
    fill: "var(--steel)",
    opacity: "0.6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: x,
    cy: "40",
    r: "26",
    fill: `url(#${id})`
  }), /*#__PURE__*/React.createElement("circle", {
    cx: x,
    cy: "38",
    r: "3",
    fill: "var(--accent)",
    opacity: "0.95"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(to bottom, transparent, color-mix(in srgb, var(--surface) 55%, transparent), var(--surface))'
    }
  }));
}
Object.assign(__ds_scope, { PlatformCanopy });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/PlatformCanopy.jsx", error: String((e && e.message) || e) }); }

// components/brand/StationBoard.jsx
try { (() => {
/** Countersunk corner bolt. Four per board. */
function Bolt({
  pos
}) {
  return /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: 'rgba(18,40,63,0.25)',
      boxShadow: '0 0 0 1px rgba(18,40,63,0.15)',
      ...pos
    }
  });
}
function StationBoard({
  devanagari,
  latin,
  regional,
  code,
  zone,
  size = 'md'
}) {
  const latinSize = size === 'sm' ? 'var(--text-lg)' : 'var(--text-board)';
  const pad = size === 'sm' ? '10px 12px' : '14px 16px';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      userSelect: 'none',
      borderRadius: 'var(--radius-hair)',
      background: 'var(--board)',
      padding: 3,
      boxShadow: 'var(--shadow-board)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 1,
      border: 'var(--border-enamel) solid var(--board-edge)',
      padding: pad,
      textAlign: 'center'
    }
  }, devanagari && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      lineHeight: 1.25,
      color: 'rgba(18,40,63,0.85)'
    }
  }, devanagari), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontFamily: 'var(--font-display)',
      fontSize: latinSize,
      lineHeight: 'var(--leading-board)',
      fontWeight: 'var(--weight-black)',
      letterSpacing: 'var(--tracking-board)',
      color: 'var(--board-ink)',
      textTransform: 'uppercase'
    }
  }, latin), regional && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '2px 0 0',
      fontSize: 'var(--text-sm)',
      lineHeight: 1.25,
      color: 'rgba(18,40,63,0.85)'
    }
  }, regional), (code || zone) && /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      paddingTop: 8,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTop: '1px solid rgba(18,40,63,0.25)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      fontSize: 'var(--text-label)',
      lineHeight: 1,
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-code)',
      color: 'var(--board-ink)'
    }
  }, code), zone && /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-label)',
      lineHeight: 1,
      letterSpacing: 'var(--tracking-code)',
      color: 'rgba(18,40,63,0.75)'
    }
  }, zone))), /*#__PURE__*/React.createElement(Bolt, {
    pos: {
      top: 6,
      left: 6
    }
  }), /*#__PURE__*/React.createElement(Bolt, {
    pos: {
      top: 6,
      right: 6
    }
  }), /*#__PURE__*/React.createElement(Bolt, {
    pos: {
      bottom: 6,
      left: 6
    }
  }), /*#__PURE__*/React.createElement(Bolt, {
    pos: {
      bottom: 6,
      right: 6
    }
  }));
}
Object.assign(__ds_scope, { StationBoard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/brand/StationBoard.jsx", error: String((e && e.message) || e) }); }

// components/core/BoardChip.jsx
try { (() => {
/**
 * The collapsed station board: a code strip, a hairline divider and a label,
 * painted in board yellow. It is what the sign-in card folds down to, and the
 * only control in the system that carries the board's paint.
 */
function BoardChip({
  code = 'PF',
  children,
  onClick
}) {
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      minHeight: 'var(--tap-min)',
      padding: '8px 14px',
      cursor: 'pointer',
      borderRadius: 'var(--radius-hair)',
      background: 'var(--board)',
      border: 'none',
      boxShadow: 'var(--shadow-board), inset 0 0 0 2px var(--board-edge)',
      transform: hover ? 'translateY(-1px)' : 'none',
      transition: 'transform var(--duration-fast) var(--ease-standard)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      fontSize: 'var(--text-label)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-code)',
      color: 'var(--board-ink)'
    }
  }, code), /*#__PURE__*/React.createElement("span", {
    style: {
      height: 14,
      width: 1,
      background: 'rgba(18,40,63,0.3)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-black)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--board-ink)'
    }
  }, children));
}
Object.assign(__ds_scope, { BoardChip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/BoardChip.jsx", error: String((e && e.message) || e) }); }

// components/core/Button.jsx
try { (() => {
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
/**
 * The app's button, in the three treatments it actually uses:
 *
 *   primary   accent fill, ground-coloured label — the one commit action
 *             in a sheet. Yellow is a fill; the label on it is never yellow.
 *   outline   hairline on --surface, ink label. Every persistent control on
 *             the map sits at this weight. Hover lifts to --surface-2 and
 *             turns the label --accent.
 *   quiet     no chrome at all: an uppercase label that turns accent on
 *             hover. "Change", "Remove", "+ Add times".
 *
 * All labels are uppercase --text-label with --tracking-label, which is what
 * makes 11px legible. Minimum height is --tap-min on primary and outline.
 */
function Button({
  variant = 'outline',
  size = 'md',
  disabled,
  children,
  onClick,
  type = 'button',
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const base = {
    fontSize: 'var(--text-label)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-label)',
    textTransform: 'uppercase',
    lineHeight: 1,
    fontFamily: 'var(--font-body)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard)',
    opacity: disabled ? variant === 'primary' ? 0.4 : 0.5 : 1
  };
  const pad = size === 'sm' ? '8px 12px' : '12px 16px';
  const looks = {
    primary: {
      background: 'var(--accent)',
      color: 'var(--ground)',
      border: 'none',
      borderRadius: 'var(--radius-sm)',
      padding: pad,
      minHeight: 'var(--tap-min)'
    },
    outline: {
      background: hover && !disabled ? 'var(--surface-2)' : 'var(--surface)',
      color: hover && !disabled ? 'var(--accent)' : 'var(--ink)',
      border: 'var(--border-hair) solid var(--line)',
      borderRadius: 'var(--radius-sm)',
      padding: pad,
      minHeight: 'var(--tap-min)'
    },
    quiet: {
      background: 'none',
      border: 'none',
      padding: 0,
      color: hover && !disabled ? 'var(--accent)' : 'var(--ink-faint)'
    }
  }[variant];
  return /*#__PURE__*/React.createElement("button", _extends({
    type: type,
    disabled: disabled,
    onClick: onClick,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      ...base,
      ...looks,
      ...style
    }
  }, rest), children);
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Button.jsx", error: String((e && e.message) || e) }); }

// components/core/Sheet.jsx
try { (() => {
/**
 * The one overlay pattern: full-bleed bottom sheet on a phone, centred modal
 * from sm up. Scrim is --ground at 60% with a 2px blur — enough to push the
 * map back without hiding what the sheet is about.
 */
function Sheet({
  title,
  open = true,
  onClose,
  children,
  width = 448
}) {
  if (!open) return null;
  return /*#__PURE__*/React.createElement("div", {
    onClick: onClose,
    style: {
      position: 'absolute',
      inset: 0,
      zIndex: 20,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 16,
      background: 'color-mix(in srgb, var(--ground) 60%, transparent)',
      backdropFilter: 'blur(2px)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    onClick: e => e.stopPropagation(),
    style: {
      maxHeight: '88%',
      width: '100%',
      maxWidth: width,
      overflow: 'auto',
      padding: 20,
      borderRadius: 'var(--radius-sheet)',
      border: 'var(--border-hair) solid var(--line)',
      background: 'var(--surface)',
      boxShadow: 'var(--shadow-sheet)'
    }
  }, title && /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 16px',
      fontSize: 'var(--text-label)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      lineHeight: 1,
      color: 'var(--ink-faint)'
    }
  }, title), children));
}
Object.assign(__ds_scope, { Sheet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/Sheet.jsx", error: String((e && e.message) || e) }); }

// components/core/VersionBadge.jsx
try { (() => {
/**
 * The corner nameplate: product name and build, split by a hairline inside a
 * single 2px-radius shell. Deliberately quiet — this used to be full-strength
 * accent on a 2px border, which spent the one colour that means "you have
 * travelled this" on a version number. The yellow belongs to the route.
 */
function VersionBadge({
  name = 'Platform',
  version = 'v0.1'
}) {
  const cell = {
    padding: '6px 10px',
    fontSize: 'var(--text-label)',
    fontWeight: 'var(--weight-semibold)',
    letterSpacing: 'var(--tracking-label)',
    textTransform: 'uppercase',
    lineHeight: 1
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      overflow: 'hidden',
      width: 'fit-content',
      borderRadius: 'var(--radius-hair)',
      border: 'var(--border-hair) solid var(--line)',
      background: 'color-mix(in srgb, var(--surface) 90%, transparent)',
      backdropFilter: 'blur(4px)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      ...cell,
      color: 'var(--ink)'
    }
  }, name), /*#__PURE__*/React.createElement("span", {
    style: {
      ...cell,
      color: 'var(--ink-faint)',
      borderLeft: 'var(--border-hair) solid var(--line)'
    }
  }, version));
}
Object.assign(__ds_scope, { VersionBadge });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/core/VersionBadge.jsx", error: String((e && e.message) || e) }); }

// components/data/MilestoneList.jsx
try { (() => {
/**
 * A list, not a wall of badges — locked ones stay visible so there is
 * something to aim at. No confetti on unlock: the map filling in is the
 * reward, this is where you check the honest thresholds.
 */
function MilestoneList({
  milestones = []
}) {
  return /*#__PURE__*/React.createElement("ul", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      listStyle: 'none',
      margin: 0,
      padding: 0
    }
  }, milestones.map(m => /*#__PURE__*/React.createElement("li", {
    key: m.id || m.label,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '10px 12px',
      borderRadius: 'var(--radius-sm)',
      border: `var(--border-hair) solid ${m.achieved ? 'color-mix(in srgb, var(--accent) 40%, transparent)' : 'var(--line)'}`,
      background: m.achieved ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      fontSize: 'var(--text-sm)',
      fontWeight: 'var(--weight-semibold)',
      color: m.achieved ? 'var(--ink)' : 'var(--ink-soft)'
    }
  }, m.label), /*#__PURE__*/React.createElement("p", {
    className: "tabular",
    style: {
      margin: '2px 0 0',
      fontSize: 'var(--text-sm)',
      color: 'var(--ink-faint)'
    }
  }, m.detail)), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      flexShrink: 0,
      fontSize: 'var(--text-lg)',
      color: m.achieved ? 'var(--accent)' : 'var(--ink-faint)'
    }
  }, m.achieved ? '✓' : '·'))));
}
Object.assign(__ds_scope, { MilestoneList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/MilestoneList.jsx", error: String((e && e.message) || e) }); }

// components/data/StatBar.jsx
try { (() => {
/**
 * The totals strip. A row of cells divided by hairlines inside one shell:
 * label above in --ink-faint, the figure below in --cream at --text-xl.
 * Cream is for large numerals only, which is exactly what these are.
 *
 * A cell marked tone="warn" is the "Not drawn" count — journeys the rail
 * graph could not route. It is --oxide on --surface-2 and sits at the end,
 * because a journey contributing 0 km to a figure labelled "Kilometres"
 * makes that figure wrong, not incomplete.
 */
function StatBar({
  stats = []
}) {
  return /*#__PURE__*/React.createElement("section", {
    "aria-label": "Your totals",
    style: {
      display: 'flex',
      overflow: 'hidden',
      width: 'fit-content',
      borderRadius: 'var(--radius-sm)',
      border: 'var(--border-hair) solid var(--line)',
      background: 'var(--surface)'
    }
  }, stats.map((s, i) => /*#__PURE__*/React.createElement("div", {
    key: s.label,
    style: {
      display: 'flex',
      flexDirection: 'column-reverse',
      alignItems: s.tone ? 'center' : 'flex-start',
      padding: '12px',
      borderRight: i === stats.length - 1 ? 'none' : 'var(--border-hair) solid var(--line)',
      background: s.tone ? 'var(--surface-2)' : 'transparent'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      marginTop: 6,
      fontSize: 'var(--text-label)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      lineHeight: 1,
      color: 'var(--ink-faint)',
      whiteSpace: 'nowrap'
    }
  }, s.label), /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      fontSize: s.tone ? 'var(--text-base)' : 'var(--text-xl)',
      lineHeight: 1,
      color: s.tone === 'warn' ? 'var(--oxide)' : 'var(--cream)'
    }
  }, s.value))));
}
Object.assign(__ds_scope, { StatBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StatBar.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextField.jsx
try { (() => {
/** The label every control in the app wears: 11px, uppercase, tracked, faint. */
function FieldLabel({
  children,
  htmlFor,
  optional
}) {
  return /*#__PURE__*/React.createElement("label", {
    htmlFor: htmlFor,
    style: {
      display: 'block',
      marginBottom: 6,
      fontSize: 'var(--text-label)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      lineHeight: 1,
      color: 'var(--ink-faint)'
    }
  }, children, optional && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink-faint)'
    }
  }, " \u2014 optional"));
}
const control = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: 'var(--radius-sm)',
  border: 'var(--border-hair) solid var(--line)',
  background: 'var(--surface)',
  color: 'var(--ink)',
  fontFamily: 'var(--font-body)',
  fontSize: 'var(--text-base)',
  outline: 'none'
};

/** Text, date or time input with the app's label above it. */
function TextField({
  label,
  optional,
  type = 'text',
  placeholder,
  value,
  onChange,
  max,
  id
}) {
  const auto = React.useId();
  const fid = id || auto;
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", null, label && /*#__PURE__*/React.createElement(FieldLabel, {
    htmlFor: fid,
    optional: optional
  }, label), /*#__PURE__*/React.createElement("input", {
    id: fid,
    type: type,
    placeholder: placeholder,
    value: value,
    max: max,
    autoComplete: "off",
    spellCheck: false,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      ...control,
      borderColor: focus ? 'var(--accent)' : 'var(--line)'
    }
  }));
}

/** Native select, styled to match TextField. */
function SelectField({
  label,
  optional,
  value,
  onChange,
  options = [],
  id
}) {
  const auto = React.useId();
  const fid = id || auto;
  const [focus, setFocus] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", null, label && /*#__PURE__*/React.createElement(FieldLabel, {
    htmlFor: fid,
    optional: optional
  }, label), /*#__PURE__*/React.createElement("select", {
    id: fid,
    value: value,
    onChange: e => onChange && onChange(e.target.value),
    onFocus: () => setFocus(true),
    onBlur: () => setFocus(false),
    style: {
      ...control,
      borderColor: focus ? 'var(--accent)' : 'var(--line)'
    }
  }, options.map(o => /*#__PURE__*/React.createElement("option", {
    key: o.value,
    value: o.value
  }, o.label))));
}

/**
 * The empty/hint slot that stands in for a control which cannot exist yet —
 * the train list before both stations are picked. Dashed when it is waiting
 * on the user, solid when it is stating a fact about the data.
 */
function FieldNote({
  children,
  waiting
}) {
  return /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 0,
      padding: '10px 12px',
      borderRadius: 'var(--radius-sm)',
      border: `var(--border-hair) ${waiting ? 'dashed' : 'solid'} var(--line)`,
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-sm)',
      color: 'var(--ink-faint)'
    }
  }, children);
}
Object.assign(__ds_scope, { FieldLabel, TextField, SelectField, FieldNote });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextField.jsx", error: String((e && e.message) || e) }); }

// components/forms/StationPicker.jsx
try { (() => {
/**
 * Station search with a result list, and the picked state it collapses to.
 *
 * Deliberately a <div> and not a <label>: a label labels one control, this
 * holds eight, and a click inside a label is forwarded to its labelable
 * descendant — which used to run onPick(null) on the "Change" button and wipe
 * the selection in the same tick the result was chosen.
 */
function StationPicker({
  label,
  value,
  onPick,
  results = [],
  query = '',
  onQuery,
  placeholder = 'Station name or code'
}) {
  const id = React.useId();
  const [focus, setFocus] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const hits = open && query ? results : [];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, label && /*#__PURE__*/React.createElement(__ds_scope.FieldLabel, {
    htmlFor: id
  }, label), value ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      padding: '10px 12px',
      borderRadius: 'var(--radius-sm)',
      border: 'var(--border-hair) solid var(--line)',
      background: 'var(--surface-2)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      minWidth: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      marginRight: 8,
      fontSize: 'var(--text-sm)',
      color: 'var(--accent)'
    }
  }, value.code), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--ink)'
    }
  }, value.name), /*#__PURE__*/React.createElement("span", {
    style: {
      marginLeft: 8,
      fontSize: 'var(--text-sm)',
      color: 'var(--ink-faint)'
    }
  }, value.state)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      onPick && onPick(null);
      setOpen(true);
    },
    style: {
      flexShrink: 0,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      fontSize: 'var(--text-label)',
      fontWeight: 'var(--weight-semibold)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--ink-faint)'
    }
  }, "Change")) : /*#__PURE__*/React.createElement("input", {
    id: id,
    role: "combobox",
    "aria-expanded": hits.length > 0,
    value: query,
    placeholder: placeholder,
    autoComplete: "off",
    autoCorrect: "off",
    autoCapitalize: "off",
    spellCheck: false,
    onChange: e => {
      onQuery && onQuery(e.target.value);
      setOpen(true);
    },
    onFocus: () => {
      setFocus(true);
      setOpen(true);
    },
    onBlur: () => setFocus(false),
    style: {
      width: '100%',
      boxSizing: 'border-box',
      padding: '10px 12px',
      borderRadius: 'var(--radius-sm)',
      border: `var(--border-hair) solid ${focus ? 'var(--accent)' : 'var(--line)'}`,
      background: 'var(--surface)',
      color: 'var(--ink)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-base)',
      outline: 'none'
    }
  }), hits.length > 0 && /*#__PURE__*/React.createElement("ul", {
    style: {
      position: 'absolute',
      zIndex: 10,
      marginTop: 4,
      listStyle: 'none',
      padding: 0,
      maxHeight: 240,
      width: '100%',
      overflow: 'auto',
      borderRadius: 'var(--radius-sm)',
      border: 'var(--border-hair) solid var(--line)',
      background: 'var(--surface)'
    }
  }, hits.map((h, i) => /*#__PURE__*/React.createElement("li", {
    key: h.code
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onPointerDown: e => e.preventDefault(),
    onClick: () => {
      onPick && onPick(h);
      setOpen(false);
    },
    style: {
      display: 'flex',
      width: '100%',
      alignItems: 'baseline',
      gap: 8,
      textAlign: 'left',
      padding: '10px 12px',
      background: 'none',
      cursor: 'pointer',
      border: 'none',
      borderBottom: i === hits.length - 1 ? 'none' : 'var(--border-hair) solid var(--line)',
      fontFamily: 'var(--font-body)',
      fontSize: 'var(--text-base)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "tabular",
    style: {
      width: 56,
      flexShrink: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--accent)'
    }
  }, h.code), /*#__PURE__*/React.createElement("span", {
    style: {
      flex: 1,
      minWidth: 0,
      color: 'var(--ink)'
    }
  }, h.name), /*#__PURE__*/React.createElement("span", {
    style: {
      flexShrink: 0,
      fontSize: 'var(--text-sm)',
      color: 'var(--ink-faint)'
    }
  }, h.state))))));
}
Object.assign(__ds_scope, { StationPicker });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/StationPicker.jsx", error: String((e && e.message) || e) }); }

// ui_kits/platform-app/App.jsx
try { (() => {
const {
  StationBoard,
  BoardBracket,
  PlatformCanopy,
  Button,
  BoardChip,
  VersionBadge,
  Sheet,
  StatBar,
  MilestoneList,
  StationPicker,
  TextField,
  SelectField,
  FieldNote,
  SignInButton,
  UserMenu
} = window.PlatformDesignSystem_1d54fc;
const STATIONS = window.PF_STATIONS;
const byCode = Object.fromEntries(STATIONS.map(s => [s.code, s]));

/* Great-circle distance, as the crow flies. The app says so rather than
   hiding that it undercounts. */
function km(a, b) {
  const R = 6371,
    r = Math.PI / 180;
  const [x1, y1] = a.lonlat,
    [x2, y2] = b.lonlat;
  const dLat = (y2 - y1) * r,
    dLon = (x2 - x1) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(y1 * r) * Math.cos(y2 * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmt = n => Math.round(n).toLocaleString('en-IN');
function statsFor(journeys) {
  let total = 0,
    longest = 0;
  const codes = new Set(),
    states = new Set();
  for (const j of journeys) {
    const a = byCode[j.fromCode],
      b = byCode[j.toCode];
    if (!a || !b) continue;
    const d = km(a, b);
    total += d;
    longest = Math.max(longest, d);
    codes.add(a.code);
    codes.add(b.code);
    states.add(a.state);
    states.add(b.state);
  }
  return {
    km: total,
    longest,
    stations: codes.size,
    states: states.size
  };
}
function SignInBoard({
  onSignIn,
  onDismiss
}) {
  return /*#__PURE__*/React.createElement("section", {
    "aria-label": "Sign in",
    style: {
      position: 'relative',
      width: '100%',
      maxWidth: 384,
      overflow: 'hidden',
      borderRadius: 'var(--radius-sm)',
      border: 'var(--border-hair) solid var(--line)',
      background: 'var(--surface)',
      boxShadow: 'var(--shadow-sheet)'
    }
  }, /*#__PURE__*/React.createElement(PlatformCanopy, null), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onDismiss,
    "aria-label": "Take the board down and look at the map",
    style: {
      position: 'absolute',
      top: 0,
      right: 0,
      zIndex: 10,
      display: 'grid',
      placeItems: 'center',
      height: 44,
      width: 44,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--ink-faint)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 12 12",
    "aria-hidden": "true"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 1 L11 11 M11 1 L1 11",
    stroke: "currentColor",
    strokeWidth: "1.6",
    strokeLinecap: "round"
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      padding: '36px 20px 20px'
    }
  }, /*#__PURE__*/React.createElement(BoardBracket, null), /*#__PURE__*/React.createElement(StationBoard, {
    devanagari: "\u092A\u094D\u0932\u0947\u091F\u092B\u093C\u0949\u0930\u094D\u092E",
    latin: "Platform",
    regional: "\u09AA\u09CD\u09B2\u09CD\u09AF\u09BE\u099F\u09AB\u09B0\u09CD\u09AE",
    code: "PF",
    zone: "EST 2026"
  }), /*#__PURE__*/React.createElement("h1", {
    style: {
      margin: '20px 0 0',
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-lg)',
      lineHeight: 1.35,
      fontWeight: 'var(--weight-black)',
      letterSpacing: '-0.01em',
      color: 'var(--ink)'
    }
  }, "Your rail life, on one map."), /*#__PURE__*/React.createElement("p", {
    style: {
      margin: '6px 0 16px',
      fontSize: 'var(--text-sm)',
      lineHeight: 'var(--leading-sm)',
      color: 'var(--ink-soft)'
    }
  }, "Log a journey in fifteen seconds and watch India fill in. The map behind this board is a preview with sample journeys."), /*#__PURE__*/React.createElement(SignInButton, {
    mode: "google",
    onSignIn: onSignIn
  })));
}
function AddJourneyForm({
  onAdd,
  onClose
}) {
  const [from, setFrom] = React.useState(null);
  const [to, setTo] = React.useState(null);
  const [qF, setQF] = React.useState('');
  const [qT, setQT] = React.useState('');
  const [train, setTrain] = React.useState('');
  const [date, setDate] = React.useState('2026-09-10');
  const [note, setNote] = React.useState('');
  const [times, setTimes] = React.useState(false);
  const search = (q, exclude) => !q ? [] : STATIONS.filter(s => s.code !== exclude && (s.code.toLowerCase().startsWith(q.toLowerCase()) || s.name.toLowerCase().includes(q.toLowerCase()))).slice(0, 6);
  const ready = from && to && from.code !== to.code;
  return /*#__PURE__*/React.createElement("form", {
    onSubmit: e => {
      e.preventDefault();
      if (ready) onAdd({
        fromCode: from.code,
        toCode: to.code,
        travelledOn: date,
        trainNumber: train || null,
        note: note || null
      });
    },
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(StationPicker, {
    label: "From",
    value: from,
    query: qF,
    onQuery: setQF,
    results: search(qF, to?.code),
    onPick: h => {
      setFrom(h);
      setQF('');
    }
  }), /*#__PURE__*/React.createElement(StationPicker, {
    label: "To",
    value: to,
    query: qT,
    onQuery: setQT,
    results: search(qT, from?.code),
    onPick: h => {
      setTo(h);
      setQT('');
    }
  }), !from || !to ? /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'block',
      marginBottom: 6,
      fontSize: 'var(--text-label)',
      fontWeight: 600,
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--ink-faint)'
    }
  }, "Train"), /*#__PURE__*/React.createElement(FieldNote, {
    waiting: true
  }, "Pick both stations and the trains that run between them appear here.")) : /*#__PURE__*/React.createElement(SelectField, {
    label: "Train",
    optional: true,
    value: train,
    onChange: setTrain,
    options: [{
      value: '',
      label: 'Not recorded — draw the shortest path'
    }, ...window.PF_TRAINS.map(t => ({
      value: t.number,
      label: `${t.number} · ${t.name} — ${t.stops} stops`
    }))]
  }), /*#__PURE__*/React.createElement(TextField, {
    label: "Travelled on",
    type: "date",
    value: date,
    max: "2026-09-10",
    onChange: setDate
  }), times ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: 12,
      borderRadius: 'var(--radius-sm)',
      border: 'var(--border-hair) solid var(--line)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 'var(--text-label)',
      fontWeight: 600,
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--ink-faint)'
    }
  }, "Departure & arrival \u2014 optional"), /*#__PURE__*/React.createElement(Button, {
    variant: "quiet",
    onClick: () => setTimes(false)
  }, "Remove")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(TextField, {
    label: "Departed",
    type: "time",
    value: "",
    onChange: () => {}
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(TextField, {
    label: "Arrived",
    type: "time",
    value: "",
    onChange: () => {}
  }))), /*#__PURE__*/React.createElement(Button, {
    variant: "quiet",
    style: {
      alignSelf: 'flex-start'
    }
  }, "Arrived: same day")) : /*#__PURE__*/React.createElement(Button, {
    variant: "quiet",
    onClick: () => setTimes(true),
    style: {
      alignSelf: 'flex-start'
    }
  }, "+ Add departure & arrival times"), /*#__PURE__*/React.createElement(TextField, {
    label: "Note",
    optional: true,
    placeholder: "Overnight, top bunk.",
    value: note,
    onChange: setNote
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 4
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    type: "submit",
    disabled: !ready,
    style: {
      flex: 1
    }
  }, "Log journey"), /*#__PURE__*/React.createElement(Button, {
    onClick: onClose
  }, "Close")));
}
function PassportCardView({
  journeys,
  stats,
  onClose
}) {
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      borderRadius: 'var(--radius-sm)',
      border: 'var(--border-hair) solid var(--line)',
      overflow: 'hidden',
      background: 'var(--ground)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 16px',
      height: 44,
      background: 'var(--board)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-display)',
      fontWeight: 800,
      fontSize: 'var(--text-lg)',
      letterSpacing: 'var(--tracking-board)',
      color: 'var(--board-ink)'
    }
  }, "PLATFORM"), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--font-mono)',
      fontSize: 'var(--text-label)',
      letterSpacing: 'var(--tracking-code)',
      color: 'var(--board-ink)'
    }
  }, "YOUR RAIL LIFE, ON ONE MAP")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: 16,
      padding: 16,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      height: 180
    }
  }, /*#__PURE__*/React.createElement(IndiaMap, {
    journeys: journeys,
    stations: STATIONS,
    seaPaused: true
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, [[fmt(stats.km), 'Kilometres'], [String(stats.stations), 'Stations'], [String(stats.states), 'States']].map(([v, l]) => /*#__PURE__*/React.createElement("div", {
    key: l
  }, /*#__PURE__*/React.createElement("div", {
    className: "tabular",
    style: {
      fontSize: 'var(--text-2xl)',
      lineHeight: 1,
      color: 'var(--cream)'
    }
  }, v), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 5,
      fontSize: 'var(--text-label)',
      fontWeight: 600,
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--ink-faint)'
    }
  }, l))), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--text-sm)',
      color: 'var(--ink)'
    }
  }, "10 September 2026")))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    variant: "primary",
    style: {
      flex: 1
    }
  }, "Download"), /*#__PURE__*/React.createElement(Button, {
    onClick: onClose
  }, "Close")));
}
function App() {
  const [signedIn, setSignedIn] = React.useState(false);
  const [boardUp, setBoardUp] = React.useState(true);
  const [own, setOwn] = React.useState([]);
  const [sheet, setSheet] = React.useState(null);
  const [picked, setPicked] = React.useState(null);
  const showingSamples = own.length === 0 && !signedIn;
  const journeys = showingSamples ? window.PF_SAMPLE_JOURNEYS : own;
  const stats = statsFor(journeys);
  const milestones = [{
    id: 'km',
    label: '1,000 km',
    achieved: stats.km >= 1000,
    detail: stats.km >= 1000 ? `${fmt(stats.km)} km — past 1,000` : `${fmt(stats.km)} km of 1,000`
  }, {
    id: 'st',
    label: '10 stations',
    achieved: stats.stations >= 10,
    detail: stats.stations >= 10 ? `${stats.stations} stations — past 10` : `${stats.stations} of 10 stations`
  }, {
    id: 'sta',
    label: '5 states',
    achieved: stats.states >= 5,
    detail: stats.states >= 5 ? `${stats.states} states — past 5` : `${stats.states} of 5 states`
  }, {
    id: 'lh',
    label: 'A journey over 24 hours',
    achieved: false,
    detail: 'Log departure and arrival times to check'
  }];
  return /*#__PURE__*/React.createElement("main", {
    style: {
      position: 'relative',
      height: '100%',
      width: '100%',
      overflow: 'hidden',
      background: 'var(--ground)'
    }
  }, /*#__PURE__*/React.createElement(IndiaMap, {
    journeys: journeys,
    stations: STATIONS,
    onPickStation: setPicked
  }), /*#__PURE__*/React.createElement("header", {
    style: {
      position: 'absolute',
      top: 12,
      left: 12,
      pointerEvents: 'none'
    }
  }, /*#__PURE__*/React.createElement(VersionBadge, {
    name: "Platform",
    version: showingSamples ? 'Sample' : 'v0.1'
  })), signedIn ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 12,
      right: 12
    }
  }, /*#__PURE__*/React.createElement(UserMenu, {
    user: {
      name: 'Saikat Bishal',
      email: 'saikat@example.com'
    },
    onSignOut: () => {
      setSignedIn(false);
      setOwn([]);
      setBoardUp(true);
    }
  })) : /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 56,
      right: 16,
      display: 'flex',
      justifyContent: 'flex-end'
    }
  }, boardUp ? /*#__PURE__*/React.createElement(SignInBoard, {
    onSignIn: () => setSignedIn(true),
    onDismiss: () => setBoardUp(false)
  }) : /*#__PURE__*/React.createElement(BoardChip, {
    code: "PF",
    onClick: () => setBoardUp(true)
  }, "Sign in")), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 12,
      left: 12,
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: () => setSheet('milestones')
  }, "Milestones"), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: () => setSheet('passport')
  }, "Passport card")), /*#__PURE__*/React.createElement(Button, {
    onClick: () => setSheet('add')
  }, "+ Log a journey"), /*#__PURE__*/React.createElement(StatBar, {
    stats: [{
      label: 'Kilometres',
      value: fmt(stats.km)
    }, {
      label: 'Stations',
      value: String(stats.stations)
    }, {
      label: 'States',
      value: String(stats.states)
    }, {
      label: 'Longest',
      value: fmt(stats.longest)
    }, ...(showingSamples ? [{
      label: 'Sample',
      value: '—',
      tone: 'warn'
    }] : [])]
  })), picked && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      bottom: 12,
      right: 12,
      width: 260
    }
  }, /*#__PURE__*/React.createElement(StationBoard, {
    size: "sm",
    latin: picked.name,
    code: picked.code,
    zone: picked.state
  }), /*#__PURE__*/React.createElement(Button, {
    size: "sm",
    onClick: () => setPicked(null),
    style: {
      marginTop: 8
    }
  }, "Close")), /*#__PURE__*/React.createElement(Sheet, {
    open: sheet === 'add',
    title: "Log a journey",
    onClose: () => setSheet(null)
  }, /*#__PURE__*/React.createElement(AddJourneyForm, {
    onClose: () => setSheet(null),
    onAdd: j => {
      setOwn(v => [...v, {
        ...j,
        id: 'u' + v.length
      }]);
      setSheet(null);
    }
  })), /*#__PURE__*/React.createElement(Sheet, {
    open: sheet === 'milestones',
    title: "Milestones",
    onClose: () => setSheet(null)
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 16
    }
  }, /*#__PURE__*/React.createElement(MilestoneList, {
    milestones: milestones
  }), /*#__PURE__*/React.createElement(Button, {
    onClick: () => setSheet(null),
    style: {
      alignSelf: 'flex-start'
    }
  }, "Close"))), /*#__PURE__*/React.createElement(Sheet, {
    open: sheet === 'passport',
    title: "Passport card",
    width: 620,
    onClose: () => setSheet(null)
  }, /*#__PURE__*/React.createElement(PassportCardView, {
    journeys: journeys,
    stats: stats,
    onClose: () => setSheet(null)
  })));
}
ReactDOM.createRoot(document.getElementById('root')).render(/*#__PURE__*/React.createElement(App, null));
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/platform-app/App.jsx", error: String((e && e.message) || e) }); }

// ui_kits/platform-app/IndiaMap.jsx
try { (() => {
/* The map. In the real app this is hand-drawn SVG from a Survey-of-India
   district file via src/lib/projection.ts — 36 states, 760 districts, 454 rail
   lines, 8,696 station dots — generated by npm run assets and gitignored, so
   none of it is in the repository. This recreation draws the same three layers
   from public-domain Natural Earth geometry instead: sea, land, routes over a
   station field. No map library, per the project's hardest rule. */

function IndiaMap({
  journeys,
  stations,
  onPickStation,
  seaPaused
}) {
  const ref = React.useRef(null);
  const [box, setBox] = React.useState({
    w: 900,
    h: 700
  });
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      setBox({
        w: e.contentRect.width,
        h: e.contentRect.height
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const [land, setLand] = React.useState(null);
  React.useEffect(() => {
    d3.json('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json').then(topo => {
      const all = topojson.feature(topo, topo.objects.countries);
      setLand({
        india: all.features.find(c => c.properties.name === 'India'),
        neighbours: all.features.filter(c => ['Pakistan', 'Nepal', 'Bangladesh', 'Bhutan', 'Myanmar', 'Sri Lanka', 'China', 'Afghanistan'].includes(c.properties.name))
      });
    });
  }, []);
  const byCode = React.useMemo(() => Object.fromEntries(stations.map(s => [s.code, s])), [stations]);
  if (!land || box.w < 10) return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      position: 'absolute',
      inset: 0
    }
  });
  const projection = d3.geoMercator().fitExtent([[24, 24], [box.w - 24, box.h - 24]], land.india);
  const path = d3.geoPath(projection);
  const at = code => {
    const s = byCode[code];
    return s ? projection(s.lonlat) : null;
  };
  const legs = journeys.map(j => ({
    id: j.id,
    a: at(j.fromCode),
    b: at(j.toCode)
  })).filter(l => l.a && l.b);
  const visited = new Set(journeys.flatMap(j => [j.fromCode, j.toCode]));
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      position: 'absolute',
      inset: 0,
      background: 'var(--sea)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: box.w,
    height: box.h,
    style: {
      display: 'block'
    }
  }, /*#__PURE__*/React.createElement("g", {
    stroke: "var(--sea-ink)",
    strokeWidth: "0.5",
    opacity: "0.28",
    fill: "none"
  }, /*#__PURE__*/React.createElement("path", {
    d: path(d3.geoGraticule().step([5, 5])())
  })), /*#__PURE__*/React.createElement("g", {
    fill: "var(--sea-ink)",
    opacity: "0.13"
  }, land.neighbours.map((c, i) => /*#__PURE__*/React.createElement("path", {
    key: i,
    d: path(c)
  }))), /*#__PURE__*/React.createElement("path", {
    d: path(land.india),
    fill: "var(--land)",
    stroke: "var(--line-strong)",
    strokeWidth: "0.8"
  }), /*#__PURE__*/React.createElement("g", null, stations.map(s => {
    const p = projection(s.lonlat);
    const seen = visited.has(s.code);
    return /*#__PURE__*/React.createElement("circle", {
      key: s.code,
      cx: p[0],
      cy: p[1],
      r: seen ? 3.5 : 2.2,
      fill: seen ? 'var(--station-seen)' : 'var(--dot)',
      opacity: seen ? 1 : 0.6,
      style: {
        cursor: 'pointer'
      },
      onClick: () => onPickStation && onPickStation(s)
    }, /*#__PURE__*/React.createElement("title", null, s.code, " \xB7 ", s.name));
  })), /*#__PURE__*/React.createElement("g", {
    fill: "none",
    strokeLinecap: "round",
    strokeLinejoin: "round"
  }, legs.map(l => /*#__PURE__*/React.createElement("path", {
    key: 'h' + l.id,
    d: `M${l.a[0]} ${l.a[1]} L${l.b[0]} ${l.b[1]}`,
    stroke: "var(--route-halo)",
    strokeWidth: "7",
    opacity: "0.3"
  })), legs.map(l => /*#__PURE__*/React.createElement("path", {
    key: l.id,
    d: `M${l.a[0]} ${l.a[1]} L${l.b[0]} ${l.b[1]}`,
    stroke: "var(--route-taken)",
    strokeWidth: "2.4"
  }))), legs.length > 0 && /*#__PURE__*/React.createElement("g", null, /*#__PURE__*/React.createElement("circle", {
    cx: legs[legs.length - 1].b[0],
    cy: legs[legs.length - 1].b[1],
    r: "9",
    fill: "var(--you-are-here)",
    opacity: "0.2"
  }, !seaPaused && /*#__PURE__*/React.createElement("animate", {
    attributeName: "r",
    values: "7;13;7",
    dur: "2.6s",
    repeatCount: "indefinite"
  })), /*#__PURE__*/React.createElement("circle", {
    cx: legs[legs.length - 1].b[0],
    cy: legs[legs.length - 1].b[1],
    r: "4",
    fill: "var(--you-are-here)"
  }))), /*#__PURE__*/React.createElement("p", {
    style: {
      position: 'absolute',
      right: 10,
      bottom: 6,
      margin: 0,
      fontSize: 'var(--text-label)',
      letterSpacing: 'var(--tracking-label)',
      textTransform: 'uppercase',
      color: 'var(--sea-ink)'
    }
  }, "Natural Earth outline \xB7 recreation"));
}
Object.assign(window, {
  IndiaMap
});
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/platform-app/IndiaMap.jsx", error: String((e && e.message) || e) }); }

// ui_kits/platform-app/stations.js
try { (() => {
/* Real station codes and coordinates ([lon, lat], GeoJSON order — getting this
   backwards produces a map of the Indian Ocean). A 20-station stand-in for the
   generated 8,696-station file, which is gitignored in the source repo. */
window.PF_STATIONS = [{
  code: 'HWH',
  name: 'Howrah Jn',
  state: 'West Bengal',
  lonlat: [88.34, 22.58]
}, {
  code: 'NJP',
  name: 'New Jalpaiguri',
  state: 'West Bengal',
  lonlat: [88.43, 26.68]
}, {
  code: 'TATA',
  name: 'Tatanagar Jn',
  state: 'Jharkhand',
  lonlat: [86.20, 22.80]
}, {
  code: 'BSP',
  name: 'Bilaspur Jn',
  state: 'Chhattisgarh',
  lonlat: [82.14, 22.08]
}, {
  code: 'NGP',
  name: 'Nagpur',
  state: 'Maharashtra',
  lonlat: [79.09, 21.15]
}, {
  code: 'BZA',
  name: 'Vijayawada Jn',
  state: 'Andhra Pradesh',
  lonlat: [80.62, 16.51]
}, {
  code: 'MAS',
  name: 'MGR Chennai Ctl',
  state: 'Tamil Nadu',
  lonlat: [80.27, 13.08]
}, {
  code: 'KPD',
  name: 'Katpadi Jn',
  state: 'Tamil Nadu',
  lonlat: [79.14, 12.97]
}, {
  code: 'NDLS',
  name: 'New Delhi',
  state: 'Delhi',
  lonlat: [77.22, 28.64]
}, {
  code: 'CSMT',
  name: 'Mumbai CSMT',
  state: 'Maharashtra',
  lonlat: [72.84, 18.94]
}, {
  code: 'SBC',
  name: 'KSR Bengaluru',
  state: 'Karnataka',
  lonlat: [77.57, 12.98]
}, {
  code: 'ADI',
  name: 'Ahmedabad Jn',
  state: 'Gujarat',
  lonlat: [72.60, 23.03]
}, {
  code: 'JP',
  name: 'Jaipur Jn',
  state: 'Rajasthan',
  lonlat: [75.79, 26.92]
}, {
  code: 'PNBE',
  name: 'Patna Jn',
  state: 'Bihar',
  lonlat: [85.14, 25.60]
}, {
  code: 'TVC',
  name: 'Thiruvananthapuram',
  state: 'Kerala',
  lonlat: [76.95, 8.49]
}, {
  code: 'GHY',
  name: 'Guwahati',
  state: 'Assam',
  lonlat: [91.75, 26.18]
}, {
  code: 'BBS',
  name: 'Bhubaneswar',
  state: 'Odisha',
  lonlat: [85.84, 20.27]
}, {
  code: 'LKO',
  name: 'Lucknow',
  state: 'Uttar Pradesh',
  lonlat: [80.94, 26.83]
}, {
  code: 'JU',
  name: 'Jodhpur Jn',
  state: 'Rajasthan',
  lonlat: [73.02, 26.29]
}, {
  code: 'CBE',
  name: 'Coimbatore Jn',
  state: 'Tamil Nadu',
  lonlat: [76.96, 11.00]
}];

/* The sample journeys, verbatim from src/features/journeys/sampleJourneys.ts.
   Real journeys with real codes — plausible fake data hides real problems. */
window.PF_SAMPLE_JOURNEYS = [{
  id: 's1',
  fromCode: 'HWH',
  toCode: 'TATA',
  travelledOn: '2025-11-14',
  trainNumber: '12860',
  note: null
}, {
  id: 's2',
  fromCode: 'TATA',
  toCode: 'BSP',
  travelledOn: '2025-11-15',
  trainNumber: '12860',
  note: null
}, {
  id: 's3',
  fromCode: 'BSP',
  toCode: 'NGP',
  travelledOn: '2025-11-15',
  trainNumber: '12860',
  note: null
}, {
  id: 's4',
  fromCode: 'NGP',
  toCode: 'BZA',
  travelledOn: '2026-02-02',
  trainNumber: null,
  note: 'Overnight, top bunk.'
}, {
  id: 's5',
  fromCode: 'BZA',
  toCode: 'MAS',
  travelledOn: '2026-02-03',
  trainNumber: '12839',
  note: null
}, {
  id: 's6',
  fromCode: 'MAS',
  toCode: 'KPD',
  travelledOn: '2026-02-03',
  trainNumber: '12007',
  note: 'Checkup. Ma met me at the station.'
}, {
  id: 's7',
  fromCode: 'HWH',
  toCode: 'NJP',
  travelledOn: '2026-04-11',
  trainNumber: '12343',
  note: null
}];
window.PF_TRAINS = [{
  number: '12860',
  name: 'Gitanjali Express',
  stops: 23
}, {
  number: '12839',
  name: 'Howrah Mail',
  stops: 31
}, {
  number: '12007',
  name: 'Shatabdi Express',
  stops: 6
}];
})(); } catch (e) { __ds_ns.__errors.push({ path: "ui_kits/platform-app/stations.js", error: String((e && e.message) || e) }); }

__ds_ns.SignInButton = __ds_scope.SignInButton;

__ds_ns.UserMenu = __ds_scope.UserMenu;

__ds_ns.BoardBracket = __ds_scope.BoardBracket;

__ds_ns.PlatformCanopy = __ds_scope.PlatformCanopy;

__ds_ns.StationBoard = __ds_scope.StationBoard;

__ds_ns.BoardChip = __ds_scope.BoardChip;

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Sheet = __ds_scope.Sheet;

__ds_ns.VersionBadge = __ds_scope.VersionBadge;

__ds_ns.MilestoneList = __ds_scope.MilestoneList;

__ds_ns.StatBar = __ds_scope.StatBar;

__ds_ns.StationPicker = __ds_scope.StationPicker;

__ds_ns.FieldLabel = __ds_scope.FieldLabel;

__ds_ns.TextField = __ds_scope.TextField;

__ds_ns.SelectField = __ds_scope.SelectField;

__ds_ns.FieldNote = __ds_scope.FieldNote;

})();
